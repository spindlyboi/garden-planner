import { useState, useEffect } from "react";

/* ======================
   Date Helpers (Safe)
====================== */

const safeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const toISO = (d) => {
  if (!d || isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const addDays = (dateStr, days) => {
  const base = safeDate(dateStr);
  if (!base || typeof days !== "number") return null;
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return toISO(d);
};

const formatShort = (dateStr) => {
  const d = safeDate(dateStr);
  if (!d) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

/* ======================
   Default Plants
====================== */

const defaultPlants = [
  { name: "Beets", daysToMaturity: 55, springOffset: -14, indoorOffset: null, succession: true, replantDelay: 5, image: "", notes: "" },
  { name: "Broccoli", daysToMaturity: 70, springOffset: -7, indoorOffset: -42, succession: false, replantDelay: 0, image: "", notes: "" },
  { name: "Carrot", daysToMaturity: 70, springOffset: -14, indoorOffset: null, succession: true, replantDelay: 5, image: "", notes: "" },
  { name: "Corn", daysToMaturity: 80, springOffset: 7, indoorOffset: null, succession: false, replantDelay: 0, image: "", notes: "" },
  { name: "Cucumber", daysToMaturity: 60, springOffset: 7, indoorOffset: -28, succession: true, replantDelay: 7, image: "", notes: "" },
  { name: "Lettuce", daysToMaturity: 45, springOffset: -14, indoorOffset: -28, succession: true, replantDelay: 5, image: "", notes: "" },
  { name: "Peas", daysToMaturity: 60, springOffset: -28, indoorOffset: null, succession: false, replantDelay: 0, image: "", notes: "" },
  { name: "Tomato", daysToMaturity: 75, springOffset: 14, indoorOffset: -56, succession: false, replantDelay: 0, image: "", notes: "" }
].sort((a,b) => a.name.localeCompare(b.name));

/* ======================
   Beds
====================== */

const createGrid = (rows, cols) =>
  Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null)
  );

const defaultBeds = {
  "Long Bed A": createGrid(3, 8),
  "Long Bed B": createGrid(3, 8),
  "In-Ground Bed": createGrid(4, 10)
};

/* ======================
   App
====================== */

export default function App() {
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [springFrost, setSpringFrost] = useState(`${currentYear}-04-30`);
  const [fallFrost, setFallFrost] = useState(`${currentYear}-10-15`);

  const [beds, setBeds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("beds"));
      return saved || defaultBeds;
    } catch {
      return defaultBeds;
    }
  });

  const [plants, setPlants] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("plants"));
      return saved || defaultPlants;
    } catch {
      return defaultPlants;
    }
  });

  const [selectedBed, setSelectedBed] = useState("Long Bed A");
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [plantName, setPlantName] = useState("");
  const [plantDate, setPlantDate] = useState("");
  const [view, setView] = useState("beds");
  const [monthView, setMonthView] = useState(new Date().getMonth());

  const [noteTarget, setNoteTarget] = useState(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    localStorage.setItem("beds", JSON.stringify(beds));
  }, [beds]);

  useEffect(() => {
    localStorage.setItem("plants", JSON.stringify(plants));
  }, [plants]);

  /* ======================
     Date Logic
  ====================== */

  const getSuggestedPlantDate = (name) => {
    const plant = plants.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (!plant) return springFrost;
    return addDays(springFrost, plant.springOffset) || springFrost;
  };

  const getIndoorStartDate = (plantName, outdoorDate) => {
    const plant = plants.find(p => p.name === plantName);
    if (!plant || plant.indoorOffset === null) return null;
    if (!outdoorDate) return null;
    return addDays(outdoorDate, plant.indoorOffset);
  };

  /* ======================
     Succession Generator
  ====================== */

  const generateSuccessions = (plant, startDate) => {
    const successions = [];
    if (!plant.succession) return successions;

    let currentPlantDate = startDate;
    const frost = safeDate(fallFrost);

    while (true) {
      const harvestDate = addDays(currentPlantDate, plant.daysToMaturity);
      const nextPlantDate = addDays(harvestDate, plant.replantDelay || 0);

      if (!harvestDate || !nextPlantDate) break;
      if (safeDate(nextPlantDate) >= frost) break;

      successions.push({
        plant: plant.name,
        date: nextPlantDate,
        daysToMaturity: plant.daysToMaturity,
        note: "Succession planting"
      });

      currentPlantDate = nextPlantDate;
    }

    return successions;
  };

  /* ======================
     Assign / Clear
  ====================== */

  const assignPlant = () => {
    if (!selectedSquare) return alert("Select a square first.");
    if (!plantName) return alert("Enter or select a plant.");

    const finalDate = plantDate || getSuggestedPlantDate(plantName);
    const validDate = safeDate(finalDate);
    if (!validDate) return alert("Invalid planting date.");

    let plantData =
      plants.find(p => p.name.toLowerCase() === plantName.toLowerCase());

    if (!plantData) {
      plantData = {
        name: plantName,
        daysToMaturity: 60,
        springOffset: 0,
        indoorOffset: null,
        succession: false,
        replantDelay: 0,
        image: "",
        notes: ""
      };
      setPlants(prev => [...prev, plantData].sort((a,b)=>a.name.localeCompare(b.name)));
    }

    const [r, c] = selectedSquare;
    const updatedBeds = { ...beds };

    updatedBeds[selectedBed] = updatedBeds[selectedBed].map((row, ri) =>
      row.map((cell, ci) =>
        ri === r && ci === c
          ? {
              plant: plantData.name,
              date: toISO(validDate),
              daysToMaturity: plantData.daysToMaturity,
              note: ""
            }
          : cell
      )
    );

    // Generate succession plantings
    const successions = generateSuccessions(plantData, toISO(validDate));
    successions.forEach(s => {
      updatedBeds[selectedBed].push([s]);
    });

    setBeds(updatedBeds);
    setPlantName("");
    setPlantDate("");
    setSelectedSquare(null);
  };

  const clearSquare = (r, c) => {
    const updated = { ...beds };
    updated[selectedBed][r][c] = null;
    setBeds(updated);
  };

  /* ======================
     Notes
  ====================== */

  const saveNote = () => {
    if (!noteTarget) return;
    const { bed, r, c } = noteTarget;

    const updated = { ...beds };
    if (updated[bed]?.[r]?.[c]) {
      updated[bed][r][c].note = noteText;
    }

    setBeds(updated);
    setNoteText("");
    setNoteTarget(null);
  };

  /* ======================
     Calendar
  ====================== */

  const getCalendarDays = () => {
    const first = new Date(year, monthView, 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const getEventsForDate = (iso) => {
    if (!iso) return [];
    const events = [];

    Object.values(beds).forEach(bed =>
      bed.forEach(row =>
        row.forEach(cell => {
          if (!cell || !cell.date) return;

          if (cell.date === iso) {
            events.push(`Plant ${cell.plant}`);
          }

          const indoor = getIndoorStartDate(cell.plant, cell.date);
          if (indoor && indoor === iso) {
            events.push(`Start ${cell.plant} Indoors`);
          }
        })
      )
    );

    return events;
  };

  /* ======================
     Render
  ====================== */

  return (
    <div style={{ padding: 12, maxWidth: 900, margin: "0 auto", fontFamily: "system-ui" }}>
      <h1 style={{ textAlign: "center" }}>🌱 Garden Planner</h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 12 }}>
        <button onClick={() => setView("beds")}>Beds</button>
        <button onClick={() => setView("calendar")}>Calendar</button>
        <button onClick={() => setView("plants")}>Plant Library</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 12 }}>
        <label>
          Year:
          <input type="number" value={year} onChange={e => setYear(+e.target.value)} style={{ width: 80 }} />
        </label>
        <label>
          Spring Frost:
          <input type="date" value={springFrost} onChange={e => setSpringFrost(e.target.value)} />
        </label>
        <label>
          Fall Frost:
          <input type="date" value={fallFrost} onChange={e => setFallFrost(e.target.value)} />
        </label>
      </div>

      {view === "beds" && (
        <>
          <h2 style={{ textAlign: "center" }}>{selectedBed}</h2>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            <select value={selectedBed} onChange={e => setSelectedBed(e.target.value)}>
              {Object.keys(beds).map(b => <option key={b}>{b}</option>)}
            </select>

            <input
              placeholder="Plant name"
              value={plantName}
              onChange={e => setPlantName(e.target.value)}
              list="plant-list"
            />
            <datalist id="plant-list">
              {plants.map((p, i) => <option key={i} value={p.name} />)}
            </datalist>

            <input type="date" value={plantDate} onChange={e => setPlantDate(e.target.value)} />
            <button onClick={assignPlant}>Assign</button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${beds[selectedBed][0].length}, minmax(60px, 1fr))`,
              gap: 6,
              marginTop: 16
            }}
          >
            {beds[selectedBed].map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  onClick={() => setSelectedSquare([r, c])}
                  style={{
                    minHeight: 70,
                    border: "1px solid #444",
                    padding: 4,
                    cursor: "pointer",
                    background: cell ? "#c8e6c9" : "#fff",
                    fontSize: 12,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  {cell && (
                    <>
                      <div>
                        <strong>{cell.plant}</strong>
                        <div>{formatShort(cell.date)}</div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span
                          style={{ cursor: "pointer", color: "blue" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setNoteTarget({ bed: selectedBed, r, c });
                            setNoteText(cell.note || "");
                          }}
                        >✏</span>

                        <span
                          style={{ cursor: "pointer", color: "red" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            clearSquare(r, c);
                          }}
                        >✖</span>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {view === "calendar" && (
        <>
          <h2 style={{ textAlign: "center" }}>Calendar</h2>

          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <select value={monthView} onChange={e => setMonthView(+e.target.value)}>
              {monthNames.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4
            }}
          >
            {getCalendarDays().map((d, i) => {
              const iso = toISO(d);
              const events = getEventsForDate(iso);

              return (
                <div key={i} style={{ minHeight: 90, border: "1px solid #ccc", padding: 4, fontSize: 11 }}>
                  <strong>{d.getDate()}</strong>
                  {events.map((e, idx) => (
                    <div key={idx}>{e}</div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      {view === "plants" && (
        <>
          <h2 style={{ textAlign: "center" }}>Plant Library</h2>
          {plants.map((p, i) => (
            <div key={i} style={{ marginBottom: 12, border: "1px solid #ccc", padding: 8 }}>
              <input value={p.name} onChange={e => {
                const copy = [...plants];
                copy[i].name = e.target.value;
                setPlants(copy);
              }} />
              <br />
              Days to Maturity:{" "}
              <input type="number" value={p.daysToMaturity} onChange={e => {
                const copy = [...plants];
                copy[i].daysToMaturity = +e.target.value;
                setPlants(copy);
              }} />
              <br />
              Spring Offset:{" "}
              <input type="number" value={p.springOffset} onChange={e => {
                const copy = [...plants];
                copy[i].springOffset = +e.target.value;
                setPlants(copy);
              }} />
              <br />
              Indoor Offset:{" "}
              <input type="number" value={p.indoorOffset ?? ""} onChange={e => {
                const copy = [...plants];
                copy[i].indoorOffset = e.target.value === "" ? null : +e.target.value;
                setPlants(copy);
              }} />
              <br />
              Succession:{" "}
              <input type="checkbox" checked={p.succession} onChange={e => {
                const copy = [...plants];
                copy[i].succession = e.target.checked;
                setPlants(copy);
              }} />
              <br />
              Replant Delay:{" "}
              <input type="number" value={p.replantDelay} onChange={e => {
                const copy = [...plants];
                copy[i].replantDelay = +e.target.value;
                setPlants(copy);
              }} />
              <br />
              <textarea
                placeholder="Notes"
                value={p.notes || ""}
                onChange={e => {
                  const copy = [...plants];
                  copy[i].notes = e.target.value;
                  setPlants(copy);
                }}
              />
            </div>
          ))}
        </>
      )}

      {noteTarget && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", padding: 12
        }}>
          <div style={{ background: "white", padding: 16, width: "100%", maxWidth: 300 }}>
            <h3>Note</h3>
            <textarea style={{ width: "100%" }} value={noteText} onChange={e => setNoteText(e.target.value)} />
            <br />
            <button onClick={saveNote}>Save</button>{" "}
            <button onClick={() => setNoteTarget(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

