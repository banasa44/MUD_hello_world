import React from "react";
import { Counter } from "./components/Counter/Counter";
import { History } from "./components/History/History";

export const App = () => {
  return (
    <div>
      <h1>B44 Hello World MUD version</h1>
      <Counter />
      <History />
    </div>
  );
};
