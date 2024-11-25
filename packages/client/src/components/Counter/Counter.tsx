import { useComponentValue } from "@latticexyz/react";
import { useMUD } from "../../MUDContext";
import { singletonEntity } from "@latticexyz/store-sync/recs";
import "./Counter.css";

export const Counter = () => {
  const {
    components: { Counter },
    systemCalls: { increment },
  } = useMUD();

  // Access the current counter value
  const counter = useComponentValue(Counter, singletonEntity);

  return (
    <div>
      Counter: <span>{counter?.value ?? "??"}</span>
      <button
        type="button"
        onClick={async (event) => {
          event.preventDefault();
          console.log("new counter value:", await increment());
        }}
      >
        Increment
      </button>
    </div>
  );
};
