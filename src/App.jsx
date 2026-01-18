import { useState, useEffect } from "react";

const todayStr = () => new Date().toISOString().slice(0, 10);

const defaultPlants = [
  { name: "Tomato", maturity: 75, harvestWindow: 21, indoorOffset: -42, start: "either" },
  { name: "Lettuce", maturity: 45, harvestWindow: 14, indoorOffset: 0, start: "outdoor" },
  { name: "Broccoli", maturity: 70, harvestWindow: 21, indoorOffset: -56, start: "either" },
];

export default function App() {
  const [plants, setPlants] = useState(() =>
    JSON.parse(localStorage.getItem("plants")) || defaultPlants
  );

  const [beds, setBeds] = useState(() =>
    JSON.parse(localStorage.getItem("beds")) || [
      {
        id: 1,
        name: "Long Bed A",
        rows: 3,
        cols: 8,
        squares: {},
      },
    ]
  );

  const [selected, setSelected] = useState(null);
  const [plantChoice, setPlantChoice] = useState("");
  const [plannedDate, setPlannedDate] = useState("");

  useEffect(() => {
    localStorage.setItem("plants", JSON.stringify(plants));
    localStorage.setItem("beds", JSON.stringify(beds));
  }, [plants, beds]);

  const assignPlant = () => {
    if (!selected || !plantChoice) return;

    const bedIndex = beds.findIndex(b => b.id === selected.bedId);
    const plant = plants.find(p => p.name === plantChoice);

    const date = plannedDate || todayStr();

    const squareData = {
      plant: plantChoice,
      plannedDate: date,
      plantedDate: null,
      status: "planned",
    };

    const updatedBeds = [...beds];
    updatedBeds[bedIndex].squares[selected.key] = squareData;

    setBeds(updatedBeds);
    setPlantChoice("");
    setPlannedDate("");
  };

  const markPlanted = (bedId, key) => {
    const updated = [...beds];
    const bed = updated.find(b => b.id === bedId);
    const sq = bed.squares[key];
    sq.plantedDate = todayStr();
    sq.status = "planted";
    setBeds(updated);
  };

  const finishPlant = (bedId, key) => {
    const updated = [...beds];
    const bed = updated.find(b => b.id === bedId);
    delete bed.squares[key];
    setBeds(updated);
  };

  const squareColor = (sq) => {
    if (!sq) return "#fff";
    if (sq.status === "planned") return "#cce5ff";
    if (sq.status === "planted") return "#b6f2b6";

    const plant = plants.find(p => p.name === sq.plant);
    if (sq.plantedDate && plant) {
      const harvestStart = new Date(sq.plantedDate);
      harvestStart.setDate(harvestStart.getDate() + plant.maturity);
      if (new Date() >= harvestStart) return "#ffe066";
    }
    return "#ddd";
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>Garden Planner</h1>

      <h2>Assign Plant</h2>
      <select value={plantChoice} onChange={e => setPlantChoice(e.target.value)}>
        <option value="">Select plant</option>
        {plants.map(p => (
          <option key={p.name}>{p.name}</option>
        ))}
      </select>

      <input
        type="date"
        value={plannedDate}
        onChange={e => setPlannedDate(e.target.value)}
      />

      <button onClick={assignPlant}>Assign</button>

      <hr />

      {beds.map(bed => (
        <div key={bed.id} style={{ marginBottom: 24 }}>
          <h2>{bed.name}</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${bed.cols}, 1fr)`,
              gap: 4,
            }}
          >
            {Array.from({ length: bed.rows * bed.cols }).map((_, i) => {
              const key = `${Math.floor(i / bed.cols)}-${i % bed.cols}`;
              const sq = bed.squares[key];

              return (
                <div
                  key={key}
                  onClick={() => setSelected({ bedId: bed.id, key })}
                  style={{
                    minHeight: 80,
                    padding: 6,
                    border: "1px solid #999",
                    background: squareColor(sq),
                    cursor: "pointer",
                  }}
                >
                  {sq && (
                    <>
                      <strong>{sq.plant}</strong>
                      <div>Planned: {sq.plannedDate}</div>

                      {sq.status === "planned" && (
                        <button onClick={() => markPlanted(bed.id, key)}>
                          🌱 Mark Planted
                        </button>
                      )}

                      {sq.status === "planted" && (
                        <button onClick={() => finishPlant(bed.id, key)}>
                          🧹 Finish
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <hr />

      <h2>Plant Library</h2>
      {plants.map((p, i) => (
        <div key={i} style={{ border: "1px solid #ccc", padding: 8, marginBottom: 8 }}>
          <input
            value={p.name}
            onChange={e => {
              const copy = [...plants];
              copy[i].name = e.target.value;
              setPlants(copy);
            }}
          />
          <label>
            Days to maturity:
            <input
              type="number"
              value={p.maturity}
              onChange={e => {
                const copy = [...plants];
                copy[i].maturity = +e.target.value;
                setPlants(copy);
              }}
            />
          </label>
          <label>
            Harvest window:
            <input
              type="number"
              value={p.harvestWindow}
              onChange={e => {
                const copy = [...plants];
                copy[i].harvestWindow = +e.target.value;
                setPlants(copy);
              }}
            />
          </label>
          <label>
            Indoor offset:
            <input
              type="number"
              value={p.indoorOffset}
              onChange={e => {
                const copy = [...plants];
                copy[i].indoorOffset = +e.target.value;
                setPlants(copy);
              }}
            />
          </label>
          <select
            value={p.start}
            onChange={e => {
              const copy = [...plants];
              copy[i].start = e.target.value;
              setPlants(copy);
            }}
          >
            <option value="indoor">Indoors</option>
            <option value="outdoor">Outdoors</option>
            <option value="either">Either</option>
          </select>
        </div>
      ))}

      <button
        onClick={() =>
          setPlants([
            ...plants,
            { name: "New Plant", maturity: 60, harvestWindow: 14, indoorOffset: 0, start: "outdoor" },
          ])
        }
      >
        + Add Plant
      </button>
    </div>
  );
}

