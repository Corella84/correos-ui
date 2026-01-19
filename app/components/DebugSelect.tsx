import { useState } from "react";

export default function DebugSelect() {
  const [provincia, setProvincia] = useState("San José");

  return (
    <div style={{ marginTop: "1rem" }}>
      <label htmlFor="debug-provincia" style={{ display: "block", marginBottom: "0.5rem" }}>
        Debug Provincia (HTML select)
      </label>
      <select
        id="debug-provincia"
        value={provincia}
        onChange={(event) => setProvincia(event.target.value)}
      >
        <option value="San José">San José</option>
        <option value="Cartago">Cartago</option>
        <option value="Alajuela">Alajuela</option>
      </select>
    </div>
  );
}
