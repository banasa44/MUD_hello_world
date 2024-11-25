import { useEffect, useState } from "react";
import { useComponentValue } from "@latticexyz/react";
import { useMUD } from "../../MUDContext";
import { singletonEntity, encodeEntity } from "@latticexyz/store-sync/recs";
import { getComponentValue } from "@latticexyz/recs";
import "./History.css";

export const History = () => {
  const {
    components: { Counter, History },
  } = useMUD();

  // State for storing history
  const [history, setHistory] = useState<
    { counter: number; blockNumber: bigint; time: string }[]
  >([]);

  // Current counter value
  const counter = useComponentValue(Counter, singletonEntity);

  // Update history whenever the counter changes
  useEffect(() => {
    if (!counter?.value) return; // Skip if counter is undefined

    const newHistory = [];
    for (let i = 0; i <= counter.value; i++) {
      const key = encodeEntity(History.metadata.keySchema, { counterValue: i });
      const value = getComponentValue(History, key);
      if (value) {
        newHistory.push({
          counter: i,
          blockNumber: value.blockNumber,
          time: new Date(Number(value.time) * 1000).toLocaleString(),
        });
      }
    }
    setHistory(newHistory);
  }, [counter, History]);

  return (
    <div>
      <h3>History</h3>
      <table border={1}>
        <thead>
          <tr>
            <th>Counter</th>
            <th>Block</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry, index) => (
            <tr key={index}>
              <td>{entry.counter}</td>
              <td>{entry.blockNumber.toString()}</td>
              <td>{entry.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
