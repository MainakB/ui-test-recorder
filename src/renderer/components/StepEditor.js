// src/renderer/components/StepEditor.js
import React from "react";
import { useSelector } from "react-redux";
import "../styles/StepEditor.css";

function StepEditor() {
  const { steps } = useSelector((state) => state.recorder);

  const renderStep = (step, index) => {
    let stepDisplay = "";

    switch (step.type) {
      case "navigation":
        stepDisplay = `navigate ${step.url}`;
        break;
      case "click":
        stepDisplay = `click ${step.selector?.[0]?.value || step.target}`;
        break;
      case "input":
        stepDisplay = `type "${step.value}" in ${
          step.selector?.[0]?.value || step.target
        }`;
        break;
      case "assert":
        stepDisplay = `assert ${step.assertType} "${step.value}" in ${
          step.selector?.[0]?.value || step.target
        }`;
        break;
      default:
        stepDisplay = JSON.stringify(step);
    }

    return (
      <div key={index} className="step-item">
        <div className="step-number">{index + 1}</div>
        <div className="step-content">{stepDisplay}</div>
      </div>
    );
  };

  return (
    <div className="step-editor">
      <h3>Recorded Steps:</h3>
      <div className="steps-container">
        {steps.length === 0 ? (
          <div className="no-steps">No steps recorded yet.</div>
        ) : (
          steps.map(renderStep)
        )}
      </div>
    </div>
  );
}

export default StepEditor;
