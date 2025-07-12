import { getColorForName } from "./utils/get-color-for-name";

const PersonBadge = ({
  name,
  personIndex,
  totalPeople,
  size = "md",
}: {
  name: string;
  personIndex: number;
  totalPeople: number;
  size: "sm" | "md" | "lg";
}) => {
  const colorPair = getColorForName(name, personIndex, totalPeople);

  const sizeClasses = {
    sm: "h-5 w-5 text-[10px]",
    md: "h-6 w-6 text-xs",
    lg: "h-8 w-8 text-sm",
  };

  return (
    <div
      className={`
        flex items-center justify-center rounded-full font-medium
        ${sizeClasses[size as keyof typeof sizeClasses]}
        ${colorPair[0]} ${colorPair[1]}
        dark:${colorPair[2]} dark:${colorPair[3]}
      `}
      title={name}
    >
      {name.substring(0, 1).toUpperCase()}
    </div>
  );
};

export default PersonBadge;
