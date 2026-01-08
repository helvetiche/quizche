"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import ErrorMessage from "../ui/ErrorMessage";
import { uploadImageToImgbb } from "@/lib/imgbb";
import Image from "next/image";

interface ProfileSetupProps {
  idToken: string;
}

const ProfileSetup = ({ idToken }: ProfileSetupProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    nameExtension: "",
    age: "",
    school: "",
  });

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (profilePhotoPreview) {
        URL.revokeObjectURL(profilePhotoPreview);
      }
    };
  }, [profilePhotoPreview]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError("First name and last name are required");
      setLoading(false);
      return;
    }

    if (!formData.age || parseInt(formData.age) <= 0) {
      setError("Please enter a valid age");
      setLoading(false);
      return;
    }

    if (!formData.school.trim()) {
      setError("School is required");
      setLoading(false);
      return;
    }

    try {
      let profilePhotoUrl: string | null = null;

      // Upload photo if selected
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
            `Failed to upload profile photo. ${error instanceof Error ? error.message : "Please try again."}`
          );
        } finally {
          setUploadingPhoto(false);
        }
      }

      const { apiPost } = await import("../../lib/api");
      const response = await apiPost("/api/users/profile", {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          middleName: formData.middleName.trim(),
          lastName: formData.lastName.trim(),
          nameExtension: formData.nameExtension.trim(),
          age: parseInt(formData.age),
          school: formData.school.trim(),
          profilePhotoUrl,
        }),
        idToken,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save profile");
      }

      const user = auth.currentUser;
      if (user) {
        await user.getIdToken(true);
      }

      window.location.reload();
    } catch (err: any) {
      console.error("Profile setup error:", err);
      setError(err.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      <h2 className="text-2xl font-light text-black">Complete Your Profile</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
        {/* Profile Photo */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-black">Profile Photo (Optional)</label>
          {profilePhotoPreview ? (
            <div className="flex flex-col gap-2">
              <div className="relative w-24 h-24 rounded-full border-2 border-black overflow-hidden">
                <Image
                  src={profilePhotoPreview}
                  alt="Profile photo preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="px-3 py-1 bg-red-600 text-white text-sm font-light hover:bg-red-700 transition-colors w-fit"
                disabled={loading || uploadingPhoto}
              >
                Remove Photo
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
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
                disabled={loading || uploadingPhoto}
                className="w-full px-4 py-2 text-sm border border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-black file:mr-2 file:py-1 file:px-2 file:border-0 file:bg-black file:text-white file:text-xs file:font-light file:cursor-pointer hover:file:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-xs font-light text-gray-500">
                Photo will be uploaded when you save
              </p>
            </div>
          )}
          {uploadingPhoto && (
            <p className="text-xs font-light text-gray-600">Uploading photo...</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="firstName" className="text-sm text-black">
            First Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            required
            className="px-4 py-2 border border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="middleName" className="text-sm text-black">
            Middle Name
          </label>
          <input
            type="text"
            id="middleName"
            name="middleName"
            value={formData.middleName}
            onChange={handleInputChange}
            className="px-4 py-2 border border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="lastName" className="text-sm text-black">
            Last Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            required
            className="px-4 py-2 border border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="nameExtension" className="text-sm text-black">
            Name Extension (Jr., Sr., III, etc.)
          </label>
          <input
            type="text"
            id="nameExtension"
            name="nameExtension"
            value={formData.nameExtension}
            onChange={handleInputChange}
            placeholder="Jr., Sr., III"
            className="px-4 py-2 border border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="age" className="text-sm text-black">
            Age <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            id="age"
            name="age"
            value={formData.age}
            onChange={handleInputChange}
            required
            min="1"
            max="150"
            className="px-4 py-2 border border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="school" className="text-sm text-black">
            School <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="school"
            name="school"
            value={formData.school}
            onChange={handleInputChange}
            required
            className="px-4 py-2 border border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {error && <ErrorMessage message={error} />}

        <button
          type="submit"
          disabled={loading || uploadingPhoto}
          className="px-6 py-3 bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading && (
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
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
};

export default ProfileSetup;
