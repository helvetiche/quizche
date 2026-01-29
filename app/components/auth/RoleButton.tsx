type RoleButtonProps = {
  role: "student" | "teacher";
  onClick: () => void;
  loading: boolean;
};

const RoleButton = ({
  role,
  onClick,
  loading,
}: RoleButtonProps): React.JSX.Element => {
  const isTeacher = role === "teacher";
  const buttonText = isTeacher ? "I am a Teacher" : "I am a Student";

  return (
    <button
      onClick={() => void onClick()}
      disabled={loading}
      className={`px-6 py-4 font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
        isTeacher
          ? "bg-black text-white hover:bg-gray-800"
          : "bg-white border-2 border-black text-black hover:bg-gray-100"
      }`}
    >
      {loading ? "Processing..." : buttonText}
    </button>
  );
};

export default RoleButton;
