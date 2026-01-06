"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthGuard from "../components/auth/AuthGuard";
import DashboardLayout from "../components/layout/DashboardLayout";
import Loading from "../components/ui/Loading";
import { uploadImageToImgbb } from "@/lib/imgbb";
import Image from "next/image";

interface ProfileData {
  firstName: string;
  lastName: string;
  age: number | null;
  school: string;
  profilePhotoUrl: string | null;
  profileCompleted: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    age: null,
    school: "",
    profilePhotoUrl: null,
    profileCompleted: false,
  });
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(
    null
  );
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
        } catch (error) {
          console.error("Error getting token:", error);
        }
      } else {
        setIdToken(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!idToken) return;

      try {
        setLoading(true);
        const response = await fetch("/api/users/profile", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await response.json();
        const profile = data.profile;
        setProfileData({
          firstName: profile.firstName || "",
          lastName: profile.lastName || "",
          age: profile.age || null,
          school: profile.school || "",
          profilePhotoUrl: profile.profilePhotoUrl || null,
          profileCompleted: profile.profileCompleted || false,
        });
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [idToken]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: name === "age" ? (value ? parseInt(value) : null) : value,
    }));
  };

  const handlePhotoSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image size must be less than 10MB");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setProfilePhotoPreview(previewUrl);
    setProfilePhotoFile(file);
  };

  const handleRemovePhoto = () => {
    if (profilePhotoPreview) {
      URL.revokeObjectURL(profilePhotoPreview);
    }
    setProfilePhotoPreview(null);
    setProfilePhotoFile(null);
    setProfileData((prev) => ({ ...prev, profilePhotoUrl: null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!profileData.firstName.trim() || !profileData.lastName.trim()) {
      setError("Name is required");
      return;
    }

    if (!profileData.age || profileData.age <= 0) {
      setError("Please enter a valid age");
      return;
    }

    if (!idToken) {
      setError("Authentication required. Please refresh the page.");
      return;
    }

    setSaving(true);

    try {
      let profilePhotoUrl = profileData.profilePhotoUrl;

      // Upload photo if new file selected
      if (profilePhotoFile) {
        setUploadingPhoto(true);
        try {
          profilePhotoUrl = await uploadImageToImgbb(profilePhotoFile, idToken);
          if (profilePhotoPreview) {
            URL.revokeObjectURL(profilePhotoPreview);
          }
        } catch (error) {
          console.error("Error uploading photo:", error);
          throw new Error(
            `Failed to upload profile photo. ${
              error instanceof Error ? error.message : "Please try again."
            }`
          );
        } finally {
          setUploadingPhoto(false);
        }
      }

      const { apiPut } = await import("../lib/api");
      const response = await apiPut("/api/users/profile", {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: profileData.firstName.trim(),
          middleName: "",
          lastName: profileData.lastName.trim(),
          nameExtension: "",
          age: profileData.age,
          school: profileData.school.trim() || "Not specified",
          profilePhotoUrl: profilePhotoUrl || null,
        }),
        idToken,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update profile");
      }

      // Refresh token to get updated profile
      const currentUser = auth.currentUser;
      if (currentUser) {
        await currentUser.getIdToken(true);
      }

      setSuccess("Profile updated successfully!");
      setProfilePhotoFile(null);
      setProfilePhotoPreview(null);

      // Reload profile data
      const profileResponse = await fetch("/api/users/profile", {
        headers: {
          Authorization: `Bearer ${await currentUser?.getIdToken()}`,
        },
      });
      if (profileResponse.ok) {
        const profileResponseData = await profileResponse.json();
        const profile = profileResponseData.profile;
        setProfileData({
          firstName: profile.firstName || "",
          lastName: profile.lastName || "",
          age: profile.age || null,
          school: profile.school || "",
          profilePhotoUrl: profile.profilePhotoUrl || null,
          profileCompleted: profile.profileCompleted || false,
        });
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (profilePhotoPreview) {
        URL.revokeObjectURL(profilePhotoPreview);
      }
    };
  }, [profilePhotoPreview]);

  if (loading && !idToken) {
    return <Loading />;
  }

  return (
    <AuthGuard requiredRole={null} onAuthSuccess={setUser}>
      <DashboardLayout
        title="QuizChe - Profile Settings"
        userEmail={user?.email}
        userRole={user?.role}
      >
        <div className="flex flex-col gap-8 max-w-2xl mx-auto">
          <div>
            <h2 className="text-3xl font-light text-black">Profile Settings</h2>
            <p className="text-lg text-gray-600 mt-2">
              Manage your profile information and photo
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-600 text-red-800">
              <p className="font-light">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border-2 border-green-600 text-green-800">
              <p className="font-light">{success}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-black font-light">Loading profile...</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
              {/* Profile Photo */}
              <div className="flex flex-col gap-4">
                <label className="text-lg font-light text-black">
                  Profile Picture
                </label>
                {profilePhotoPreview || profileData.profilePhotoUrl ? (
                  <div className="flex flex-col gap-4">
                    <div className="relative w-40 h-40 rounded-full border-2 border-black overflow-hidden bg-gray-100">
                      <Image
                        src={
                          profilePhotoPreview ||
                          profileData.profilePhotoUrl ||
                          ""
                        }
                        alt="Profile photo"
                        fill
                        className="object-cover"
                        unoptimized={!!profilePhotoPreview}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="px-4 py-2 bg-black text-white font-light hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        Change Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handlePhotoSelect(file);
                            }
                            e.target.value = "";
                          }}
                          disabled={saving || uploadingPhoto}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="px-4 py-2 bg-red-600 text-white font-light hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={saving || uploadingPhoto}
                      >
                        Remove
                      </button>
                    </div>
                    {uploadingPhoto && (
                      <p className="text-sm font-light text-gray-600">
                        Uploading photo...
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <label className="px-4 py-3 border-2 border-black bg-white text-black font-light hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-center">
                      Choose Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handlePhotoSelect(file);
                          }
                          e.target.value = "";
                        }}
                        disabled={saving || uploadingPhoto}
                        className="hidden"
                      />
                    </label>
                    <p className="text-sm font-light text-gray-500">
                      Photo will be uploaded when you save
                    </p>
                    {uploadingPhoto && (
                      <p className="text-sm font-light text-gray-600">
                        Uploading photo...
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Name Fields */}
              <div className="flex flex-col gap-4">
                <label
                  htmlFor="firstName"
                  className="text-lg font-light text-black"
                >
                  First Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={profileData.firstName}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your first name"
                  className="w-full px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"
                  disabled={saving || uploadingPhoto}
                />
              </div>

              <div className="flex flex-col gap-4">
                <label
                  htmlFor="lastName"
                  className="text-lg font-light text-black"
                >
                  Last Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={profileData.lastName}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your last name"
                  className="w-full px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"
                  disabled={saving || uploadingPhoto}
                />
              </div>

              <div className="flex flex-col gap-4">
                <label htmlFor="age" className="text-lg font-light text-black">
                  Age <span className="text-red-600">*</span>
                </label>
                <input
                  id="age"
                  name="age"
                  type="number"
                  value={profileData.age || ""}
                  onChange={handleInputChange}
                  required
                  min="1"
                  max="150"
                  placeholder="Enter your age"
                  className="w-full px-4 py-3 border-2 border-black bg-white text-black font-light focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"
                  disabled={saving || uploadingPhoto}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={saving || uploadingPhoto}
                  className="px-8 py-3 bg-black text-white font-light hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving && (
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-8 py-3 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={saving || uploadingPhoto}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
