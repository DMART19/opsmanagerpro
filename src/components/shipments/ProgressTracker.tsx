import { CheckCircle, Circle } from "lucide-react";

interface ProgressTrackerProps {
  currentStep: number;
}

export const ProgressTracker = ({ currentStep }: ProgressTrackerProps) => {
  const steps = [
    { id: 1, label: "Overview" },
    { id: 2, label: "Contents" },
    { id: 3, label: "Packaging" },
    { id: 4, label: "Signatures" },
  ];

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 -z-10">
          <div 
            className="h-full bg-[#2F5FFF] transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
        
        {steps.map((step) => (
          <div key={step.id} className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all ${
              step.id <= currentStep 
                ? "bg-[#2F5FFF] border-[#2F5FFF]" 
                : "bg-white border-gray-300"
            }`}>
              {step.id <= currentStep ? (
                <CheckCircle className="h-5 w-5 text-white" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <p className={`mt-2 text-sm font-medium ${
              step.id <= currentStep ? "text-[#2F5FFF]" : "text-gray-400"
            }`}>
              {step.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
