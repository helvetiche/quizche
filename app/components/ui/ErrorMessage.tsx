type ErrorMessageProps = {
  message: string;
};

const ErrorMessage = ({ message }: ErrorMessageProps): React.JSX.Element => {
  return (
    <p className="text-sm text-red-600" role="alert">
      {message}
    </p>
  );
};

export default ErrorMessage;
