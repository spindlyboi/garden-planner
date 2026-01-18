import { useEffect, useState } from "react";

/* ------------------ Utilities ------------------ */

const safeDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d) ? null : d;
};

const toISO = (d) => (d && !isNaN(d) ? d.toISOString().slice(0, 10) : null);

const addDays = (dateStr, days) => {
  const d = safeDate(dateStr);
  if (!d || typeof days !== "number") return null;
  d.setDate(d.getDate() + days);
  return toISO(d);
};

const shortDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";

/* ------------------ Defaults ------------------ */

const defaultPlants = [
  { name: "Broccoli", days: 70, springOffset: -7, indoorOffset: -42, startMethod: "indoor" },
  { name: "Tomato", days: 75, springOffset: 14, indoorOffset: -56, startMethod: "indoor" },
  { name: "Lettuce", days: 45, springOffset: -14, indoorOffset: -28, startMethod: "indoor" },
  { name: "Carrot", days: 70, springOffset: -14, indoorOffset: null, startMethod: "outdoor" },
];

const makeGrid = (r, c) =>
  Array.from({ length: r }, () => Array.from({ length: c }, () => null));

const defaultBeds = {
  "Long Bed A": makeGrid(3, 8),
};

/* ------------------ App ------------------ */

export default function App() {
  const year = new Date().getFullYear();

  const [springFrost, setSpringFrost] = useState(`${year}-04-30`);
  const [beds, setBeds] = useState(() => JSON.parse(localStorage.getItem("beds")) || defaultBeds);
  const [plants, setPlants] = useState(
    () => JSON.parse(localStorage.getItem("plants")) || defaultPlants
  );

  const [view, setView] = useState("beds");
  const [selectedBed, setSelectedBed] = useState(Object.keys(beds)[0]);
  const [selectedSquare, setSelectedSquare] = useState(null);

  const [plantName, setPlantName] = useState("");
  const [plantDate, setPlantDate] = useState("");

  /* ------------------ Persistence ------------------ */

  useEffect(() => localStorage.setItem("beds", JSON.stringify(beds)), [beds]);
  useEffect(() => localStorage.setItem("plants", JSON.stringify(plants)), [plants]);

  /* ------------------ Logic ------------------ */

  const getPlant = (name) => plants.find((p) => p.name === name);

  const getOutdoorDate = (name) => {
    const plant = getPlant(name);
    return plant ? addDays(springFrost, plant.springOffset) : springFrost;
  };

  const getIndoorDate = (square) => {
    const plant = getPlant(square.plant);
    if (!plant || plant.startMethod !== "indoor") return null;
    return addDays(square.date, plant.indoorOffset);
  };

  const assignPlant = () => {
    if (!selectedSquare || !plantName) return;

    const finalDate = plantDate || getOutdoorDate(plantName);
    if (!safeDate(finalDate)) return;

    if (!getPlant(plantName)) {
      setPlants((p) => [...p, { name: plantName, days: 60, springOffset: 0, indoorOffset: null, startMethod: "outdoor" }]);
    }

    const [r, c] = selectedSquare;
    const copy = { ...beds };
    copy[selectedBed][r][c] = { plant: plantName, date: finalDate };
    setBeds(copy);

    setPlantName("");
    setPlantDate("");
    setSelectedSquare(null);
  };

  /* ------------------ Bed Editor ------------------ */

  const resizeBed = (bed, dr, dc) => {
    const g = beds[bed];
    let rows = g.length + dr;
    let cols = g[0].length + dc;
    if (rows < 1 || cols < 1) return;

    const newGrid = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => g[r]?.[c] || null)
    );

    setBeds({ ...beds, [bed]: newGrid });
  };

  /* ------------------ Render ------------------ */

  return (
    <div style={{ padding: 16 }}>
      <h1>Garden Planner</h1>

      <div>
        <button onClick={() => setView("beds")}>Beds</button>{" "}
        <button onClick={() => setView("calendar")}>Calendar</button>{" "}
        <button onClick={() => setView("plants")}>Plant Library</button>
      </div>

      <div style={{ marginTop: 10 }}>
        Spring Frost:{" "}
        <input type="date" value={springFrost} onChange={(e) => setSpringFrost(e.target.value)} />
      </div>

      {/* ------------------ Beds ------------------ */}

      {view === "beds" && (
        <>
          <h2>{selectedBed}</h2>

          <select value={selectedBed} onChange={(e) => setSelectedBed(e.target.value)}>
            {Object.keys(beds).map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>

          <button onClick={() => setBeds({ ...beds, [`New Bed ${Date.now()}`]: makeGrid(3, 6) })}>
            ➕ Add Bed
          </button>

          <div>
            <button onClick={() => resizeBed(selectedBed, 1, 0)}>+ Row</button>
            <button onClick={() => resizeBed(selectedBed, -1, 0)}>- Row</button>
            <button onClick={() => resizeBed(selectedBed, 0, 1)}>+ Col</button>
            <button onClick={() => resizeBed(selectedBed, 0, -1)}>- Col</button>
          </div>

          <div>
            Plant:
            <input value={plantName} onChange={(e) => setPlantName(e.target.value)} list="plants" />
            <datalist id="plants">{plants.map((p) => <option key={p.name} />)}</datalist>
            Date:
            <input type="date" value={plantDate} onChange={(e) => setPlantDate(e.target.value)} />
            <button onClick={assignPlant}>Assign</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: `repeat(${beds[selectedBed][0].length}, 1fr)`, gap: 6 }}>
            {beds[selectedBed].map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  onClick={() => setSelectedSquare([r, c])}
                  style={{
                    border: "1px solid #333",
                    padding: 6,
                    minHeight: 60,
                    background: cell ? "#c8e6c9" : "#fff",
                  }}
                >
                  {cell && (
                    <>
                      <strong>{cell.plant}</strong>
                      <div>{shortDate(cell.date)}</div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ------------------ Calendar ------------------ */}

      {view === "calendar" && (
        <>
          <h2>Calendar</h2>
          {Object.values(beds).flat().flat().map(
            (sq, i) =>
              sq && (
                <div key={i}>
                  🌱 {sq.plant} outdoors: {shortDate(sq.date)}
                  {getIndoorDate(sq) && <> | indoors: {shortDate(getIndoorDate(sq))}</>}
                </div>
              )
          )}
        </>
      )}

      {/* ------------------ Plant Library ------------------ */}

      {view === "plants" && (
        <>
          <h2>Plant Library</h2>
          <button onClick={() => setPlants([...plants, { name: "New Plant", days: 60, springOffset: 0, indoorOffset: null, startMethod: "outdoor" }])}>
            ➕ Add Plant
          </button>

          {plants.map((p, i) => (
            <div key={i} style={{ border: "1px solid #aaa", padding: 8, marginBottom: 8 }}>
              Name <input value={p.name} onChange={(e) => {
                const copy = [...plants]; copy[i].name = e.target.value; setPlants(copy);
              }} />
              Days <input type="number" value={p.days} onChange={(e) => {
                const copy = [...plants]; copy[i].days = +e.target.value; setPlants(copy);
              }} />
              Spring Offset <input type="number" value={p.springOffset} onChange={(e) => {
                const copy = [...plants]; copy[i].springOffset = +e.target.value; setPlants(copy);
              }} />
              Indoor Offset <input type="number" value={p.indoorOffset ?? ""} onChange={(e) => {
                const copy = [...plants]; copy[i].indoorOffset = e.target.value === "" ? null : +e.target.value; setPlants(copy);
              }} />
              Start:
              <select value={p.startMethod} onChange={(e) => {
                const copy = [...plants]; copy[i].startMethod = e.target.value; setPlants(copy);
              }}>
                <option value="outdoor">Outdoors</option>
                <option value="indoor">Indoors</option>
              </select>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

