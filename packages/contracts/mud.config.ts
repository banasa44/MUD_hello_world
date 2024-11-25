import { defineWorld } from "@latticexyz/world";

export default defineWorld({
  namespace: "app",
  tables: {
    Counter: {
      schema: {
        value: "uint32",
      },
      key: [],
    },
    History: {
      schema: {
        counterValue: "uint32",
        blockNumber: "uint256",
        time: "uint256",
      },
      key: ["counterValue"],
    },
  },
});
