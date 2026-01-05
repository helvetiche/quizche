"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import ErrorMessage from "../ui/ErrorMessage";

interface ProfileSetupProps {
  userId: string;
  idToken: string;
}

const ProfileSetup = ({ userId, idToken }: ProfileSetupProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    nameExtension: "",
    age: "",
    school: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
      const response = await fetch("/api/users/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          middleName: formData.middleName.trim(),
          lastName: formData.lastName.trim(),
          nameExtension: formData.nameExtension.trim(),
          age: parseInt(formData.age),
          school: formData.school.trim(),
        }),
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
          disabled={loading}
          className="px-6 py-3 bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
};

export default ProfileSetup;
