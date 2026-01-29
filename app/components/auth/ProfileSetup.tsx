"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import ErrorMessage from "../ui/ErrorMessage";
import { uploadImageToImgbb } from "@/lib/imgbb";
import Image from "next/image";
import TiltedCard from "@/components/TiltedCard";

type ProfileSetupProps = {
  idToken: string;
};

const ProfileSetup = ({ idToken }: ProfileSetupProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(
    null
  );
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    nameExtension: "",
    age: "",
    school: "",
  });

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

  const formContent = (
    <div className="bg-amber-100 border-3 border-black rounded-2xl overflow-hidden w-full h-full flex flex-col shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      {/* Card Header */}
      <div className="px-5 py-3 border-b-2 border-black flex items-center justify-between flex-shrink-0">
        <div className="flex gap-1.5">
          <span className="w-3.5 h-3.5 bg-red-500 border-2 border-black rounded-full"></span>
          <span className="w-3.5 h-3.5 bg-yellow-500 border-2 border-black rounded-full"></span>
          <span className="w-3.5 h-3.5 bg-green-500 border-2 border-black rounded-full"></span>
        </div>
        <span className="font-bold text-black text-sm">Profile Details</span>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="p-5 flex flex-col gap-3 flex-1 overflow-auto"
      >
        {/* Profile Photo */}
        <div className="flex justify-center mb-2">
          {profilePhotoPreview ? (
            <div className="relative">
              <div className="relative w-16 h-16 rounded-full border-3 border-black overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
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
                className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-110 transition-transform"
                disabled={loading || uploadingPhoto}
              >
                <span className="material-icons-outlined text-white text-xs">
                  close
                </span>
              </button>
            </div>
          ) : (
            <label className="cursor-pointer group">
              <div className="w-16 h-16 rounded-full border-3 border-dashed border-gray-400 flex flex-col items-center justify-center bg-amber-50 group-hover:border-black group-hover:bg-amber-200 transition-all">
                <span className="material-icons-outlined text-gray-400 text-lg group-hover:text-black transition-colors">
                  add_a_photo
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoSelect(file);
                  e.target.value = "";
                }}
                disabled={loading || uploadingPhoto}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Name Fields - All in one row */}
        <div className="grid grid-cols-4 gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="firstName" className="text-xs font-bold text-black">
              First <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              required
              placeholder="Juan"
              className="px-2 py-2 bg-amber-50 border-2 border-black rounded-lg text-black font-medium text-sm placeholder:text-gray-400 focus:outline-none focus:bg-white transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="middleName"
              className="text-xs font-bold text-black"
            >
              Middle
            </label>
            <input
              type="text"
              id="middleName"
              name="middleName"
              value={formData.middleName}
              onChange={handleInputChange}
              placeholder="Santos"
              className="px-2 py-2 bg-amber-50 border-2 border-black rounded-lg text-black font-medium text-sm placeholder:text-gray-400 focus:outline-none focus:bg-white transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="lastName" className="text-xs font-bold text-black">
              Last <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              required
              placeholder="Dela Cruz"
              className="px-2 py-2 bg-amber-50 border-2 border-black rounded-lg text-black font-medium text-sm placeholder:text-gray-400 focus:outline-none focus:bg-white transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="nameExtension"
              className="text-xs font-bold text-black"
            >
              Suffix
            </label>
            <input
              type="text"
              id="nameExtension"
              name="nameExtension"
              value={formData.nameExtension}
              onChange={handleInputChange}
              placeholder="Jr."
              className="px-2 py-2 bg-amber-50 border-2 border-black rounded-lg text-black font-medium text-sm placeholder:text-gray-400 focus:outline-none focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Age and School */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="age" className="text-xs font-bold text-black">
              Age <span className="text-red-500">*</span>
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
              placeholder="18"
              className="px-3 py-2 bg-amber-50 border-2 border-black rounded-lg text-black font-medium text-sm placeholder:text-gray-400 focus:outline-none focus:bg-white transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="school" className="text-xs font-bold text-black">
              School <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="school"
              name="school"
              value={formData.school}
              onChange={handleInputChange}
              required
              placeholder="Your school"
              className="px-3 py-2 bg-amber-50 border-2 border-black rounded-lg text-black font-medium text-sm placeholder:text-gray-400 focus:outline-none focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-1">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || uploadingPhoto}
          className="mt-auto w-full px-6 py-3 bg-amber-200 text-black font-bold border-3 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-3 border-black border-t-transparent rounded-full animate-spin"></div>
              <span>{uploadingPhoto ? "Uploading..." : "Saving..."}</span>
            </>
          ) : (
            <>
              <span>Get Started</span>
              <span className="material-icons-outlined text-lg">
                arrow_forward
              </span>
            </>
          )}
        </button>
      </form>
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-200 border-3 border-black rounded-full mb-6">
          <span className="material-icons-outlined text-black text-lg">
            waving_hand
          </span>
          <span className="font-bold text-black text-sm">Almost there</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-black text-black tracking-tight mb-3">
          Let's set up your profile
        </h1>

        <p className="text-lg font-medium text-gray-700 max-w-lg mx-auto">
          Just a few details and you'll be ready to start your learning journey.
        </p>
      </div>

      {/* Form Card with TiltedCard animation */}
      <div className="w-full">
        <TiltedCard
          containerHeight="420px"
          containerWidth="100%"
          imageHeight="420px"
          imageWidth="100%"
          scaleOnHover={1.02}
          rotateAmplitude={6}
          showMobileWarning={false}
          showTooltip={false}
          displayOverlayContent={true}
          overlayContent={formContent}
        />
      </div>
    </div>
  );
};

export default ProfileSetup;
