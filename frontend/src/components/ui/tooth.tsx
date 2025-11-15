import React from "react";

const ToothIcon = ({
  type = "incisor",
  state = "healthy",
  size = 40,
  className = "",
}) => {
  const getToothPath = (type) => {
    const paths = {
      incisor:
        "M 20 10 Q 35 5 50 10 Q 55 15 55 25 L 55 45 Q 55 55 50 60 Q 45 65 40 70 L 35 80 Q 32.5 82 30 82 Q 27.5 82 25 80 L 20 70 Q 15 65 10 60 Q 5 55 5 45 L 5 25 Q 5 15 10 10 Q 15 5 20 10 Z",
      canine:
        "M 15 15 Q 25 8 35 15 Q 40 20 40 28 L 40 48 Q 40 58 35 65 Q 30 72 27 78 L 25 85 Q 23 87 20 87 Q 17 87 15 85 L 13 78 Q 10 72 5 65 Q 0 58 0 48 L 0 28 Q 0 20 5 15 Q 10 8 15 15 Z",
      premolar:
        "M 12 18 Q 22 12 32 18 Q 38 22 38 32 L 38 45 Q 38 52 35 58 Q 32 64 28 68 L 25 75 Q 23 77 20 77 Q 17 77 15 75 L 12 68 Q 8 64 5 58 Q 2 52 2 45 L 2 32 Q 2 22 8 18 Q 12 12 12 18 Z",
      molar:
        "M 8 22 Q 18 16 32 22 Q 40 26 40 36 L 40 50 Q 40 60 35 66 Q 30 72 26 76 L 24 82 Q 22 84 20 84 Q 18 84 16 82 L 14 76 Q 10 72 5 66 Q 0 60 0 50 L 0 36 Q 0 26 8 22 Z",
    };
    return paths[type] || paths.incisor;
  };

  const getStateStyles = (state) => {
    const styles = {
      healthy: { fill: "#fff", stroke: "#4CAF50", strokeWidth: 2 },
      cavity: { fill: "#fff", stroke: "#f44336", strokeWidth: 2 },
      filled: { fill: "#fff", stroke: "#333", strokeWidth: 2 },
      crown: { fill: "#FFD700", stroke: "#333", strokeWidth: 2 },
      missing: {
        fill: "none",
        stroke: "#ccc",
        strokeWidth: 2,
        strokeDasharray: "5,5",
      },
    };
    return styles[state] || styles.healthy;
  };

  const getCusps = (type) => {
    if (type === "canine") {
      return <circle cx="20" cy="25" r="2" fill="#333" />;
    }
    if (type === "premolar") {
      return (
        <>
          <circle cx="15" cy="30" r="1.5" fill="#333" />
          <circle cx="25" cy="30" r="1.5" fill="#333" />
        </>
      );
    }
    if (type === "molar") {
      return (
        <>
          <circle cx="10" cy="34" r="1.5" fill="#333" />
          <circle cx="20" cy="34" r="1.5" fill="#333" />
          <circle cx="30" cy="34" r="1.5" fill="#333" />
          <circle cx="15" cy="44" r="1.5" fill="#333" />
          <circle cx="25" cy="44" r="1.5" fill="#333" />
        </>
      );
    }
    return null;
  };

  const getProblemIndicator = (state) => {
    if (state === "cavity") {
      return <circle cx="20" cy="35" r="4" fill="#f44336" />;
    }
    if (state === "filled") {
      return <rect x="15" y="30" width="10" height="8" fill="#9e9e9e" rx="2" />;
    }
    return null;
  };

  const styles = getStateStyles(state);
  const viewBox = type === "molar" ? "0 0 40 90" : "0 0 60 90";

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={getToothPath(type)} {...styles} />
      {getCusps(type)}
      {getProblemIndicator(state)}
    </svg>
  );
};

const upperTeeth = [
  { id: 18, type: "molar", position: "upper-right" },
  { id: 17, type: "molar", position: "upper-right" },
  { id: 16, type: "molar", position: "upper-right" },
  { id: 15, type: "premolar", position: "upper-right" },
  { id: 14, type: "premolar", position: "upper-right" },
  { id: 13, type: "canine", position: "upper-right" },
  { id: 12, type: "incisor", position: "upper-right" },
  { id: 11, type: "incisor", position: "upper-right" },
  { id: 21, type: "incisor", position: "upper-left" },
  { id: 22, type: "incisor", position: "upper-left" },
  { id: 23, type: "canine", position: "upper-left" },
  { id: 24, type: "premolar", position: "upper-left" },
  { id: 25, type: "premolar", position: "upper-left" },
  { id: 26, type: "molar", position: "upper-left" },
  { id: 27, type: "molar", position: "upper-left" },
  { id: 28, type: "molar", position: "upper-left" },
];

const lowerTeeth = [
  { id: 48, type: "molar", position: "lower-right" },
  { id: 47, type: "molar", position: "lower-right" },
  { id: 46, type: "molar", position: "lower-right" },
  { id: 45, type: "premolar", position: "lower-right" },
  { id: 44, type: "premolar", position: "lower-right" },
  { id: 43, type: "canine", position: "lower-right" },
  { id: 42, type: "incisor", position: "lower-right" },
  { id: 41, type: "incisor", position: "lower-right" },
  { id: 31, type: "incisor", position: "lower-left" },
  { id: 32, type: "incisor", position: "lower-left" },
  { id: 33, type: "canine", position: "lower-left" },
  { id: 34, type: "premolar", position: "lower-left" },
  { id: 35, type: "premolar", position: "lower-left" },
  { id: 36, type: "molar", position: "lower-left" },
  { id: 37, type: "molar", position: "lower-left" },
  { id: 38, type: "molar", position: "lower-left" },
];

const Tooth = ({
  toothId,
  state = "healthy",
  onToothClick,
  size = 40,
  className = "",
}) => {
  const allTeeth = [...upperTeeth, ...lowerTeeth];
  const tooth = allTeeth.find((t) => t.id === toothId);

  if (!tooth) return null;

  return (
    <div
      className={`tooth-container flex flex-col items-center justify-center p-1 ${className}`}
      onClick={() => onToothClick?.(tooth)}
    >
      <ToothIcon type={tooth.type} state={state} size={size} />
      <span className="tooth-number text-xs font-medium text-gray-700 mt-1">
        {tooth.id}
      </span>
    </div>
  );
};

const ToothChart = ({ toothStates = {}, onToothClick, size = 32 }) => {
  const upperRight = upperTeeth.filter((t) => t.position === "upper-right");
  const upperLeft = upperTeeth.filter((t) => t.position === "upper-left");
  const lowerRight = lowerTeeth.filter((t) => t.position === "lower-right");
  const lowerLeft = lowerTeeth.filter((t) => t.position === "lower-left");

  return (
    <div className="tooth-chart w-full overflow-x-auto">
      {/* Upper Jaw */}
      <div className="upper-jaw mb-4">
        <h4 className="text-xs font-medium text-gray-600 mb-2 text-center">
          Arcada Superior
        </h4>
        <div className="flex justify-center items-center min-w-max px-2">
          {/* Upper Right (18-11) */}
          <div className="flex">
            {upperRight.map((tooth) => (
              <div key={tooth.id} className="text-center mx-0.5">
                <Tooth
                  toothId={tooth.id}
                  state={toothStates[tooth.id] || "healthy"}
                  onToothClick={onToothClick}
                  size={size}
                  className="hover:scale-105 transition-transform cursor-pointer"
                />
              </div>
            ))}
          </div>

          {/* Midline separator */}
          <div className="w-0.5 h-8 bg-gray-400 mx-2"></div>

          {/* Upper Left (21-28) */}
          <div className="flex">
            {upperLeft.map((tooth) => (
              <div key={tooth.id} className="text-center mx-0.5">
                <Tooth
                  toothId={tooth.id}
                  state={toothStates[tooth.id] || "healthy"}
                  onToothClick={onToothClick}
                  size={size}
                  className="hover:scale-105 transition-transform cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lower Jaw */}
      <div className="lower-jaw">
        <div className="flex justify-center items-center min-w-max px-2">
          {/* Lower Right (48-41) */}
          <div className="flex">
            {lowerRight.map((tooth) => (
              <div key={tooth.id} className="text-center mx-0.5">
                <Tooth
                  toothId={tooth.id}
                  state={toothStates[tooth.id] || "healthy"}
                  onToothClick={onToothClick}
                  size={size}
                  className="hover:scale-105 transition-transform cursor-pointer"
                />
              </div>
            ))}
          </div>

          {/* Midline separator */}
          <div className="w-0.5 h-8 bg-gray-400 mx-2"></div>

          {/* Lower Left (31-38) */}
          <div className="flex">
            {lowerLeft.map((tooth) => (
              <div key={tooth.id} className="text-center mx-0.5">
                <Tooth
                  toothId={tooth.id}
                  state={toothStates[tooth.id] || "healthy"}
                  onToothClick={onToothClick}
                  size={size}
                  className="hover:scale-105 transition-transform cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>
        <h4 className="text-xs font-medium text-gray-600 mt-2 text-center">
          Arcada Inferior
        </h4>
      </div>
    </div>
  );
};

export { ToothIcon, Tooth, ToothChart, upperTeeth, lowerTeeth };
export default ToothIcon;
