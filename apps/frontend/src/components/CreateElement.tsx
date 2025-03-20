import axios from "axios";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import Button from "./ui/Button";
import { useRecoilState } from "recoil";
import { spaceState } from "../store/spaceAtom";
import { BACKEND_URL } from "../config";

// Type Definitions
interface Element {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  static: boolean;
}
// Type Definitions
interface ElementType {
  onClick: () => void;
}
interface MapType {
  onClick: () => void;
}

interface MapElement {
  elementId: string;
  x: number;
  y: number;
  element: Element;
}

interface Map {
  id: string;
  name: string;
  width: number;
  height: number;
  thumbnail: string;
}

interface Space {
  id?: string;
  name: string;
  mapId: string;
  dimensions: string;
}

// Custom Styles
const styles = {
  card: {
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    padding: "16px",
    margin: "16px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    maxWidth: "600px",
    width: "100%",
  },
  input: {
    width: "100%",
    padding: "8px",
    margin: "8px 0",
    border: "1px solid #ccc",
    borderRadius: "4px",
  },
  button: {
    padding: "10px 16px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    width: "100%",
    marginTop: "16px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(20, 20px)",
    gap: "2px",
  },
  gridCell: {
    width: "20px",
    height: "20px",
    border: "1px solid #e0e0e0",
    cursor: "pointer",
  },
  tabs: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "16px",
  },
  tab: {
    padding: "10px 16px",
    margin: "0 8px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    cursor: "pointer",
  },
};

// Mock API Service
const API = {
  createElement: async (elementData: Omit<Element, "id">): Promise<Element> => {
    try {
      const res = await axios.post(
        `${BACKEND_URL}/admin/element`,
        { elementData },
        { headers: { Authorization: `${localStorage.getItem("token")}` } }
      );
      console.log(res.data);
      toast("element created successfully");
    } catch (error) {
      toast("eeror in creating the element");
    }
    return elementData;
  },
  createMap: async (mapData: Omit<Map, "id">): Promise<Map> => {
    return { id: Date.now().toString(), ...mapData };
  },
  createSpace: async (spaceData: Omit<Space, "id">): Promise<Space> => {
    return { id: Date.now().toString(), ...spaceData };
  },
  fetchElements: async (): Promise<Element[]> => {
    return [
      {
        id: "1",
        imageUrl: "https://via.placeholder.com/50",
        width: 1,
        height: 1,
      },
      {
        id: "2",
        imageUrl: "https://via.placeholder.com/50",
        width: 2,
        height: 1,
      },
    ];
  },
  fetchMaps: async (): Promise<Map[]> => {
    return [
      {
        id: "1",
        name: "Office Layout",
        dimensions: "20x20",
      },
    ];
  },
};

// Element Creation Component
export const ElementCreation = ({ onClick }: ElementType) => {
  const [imageUrl, setImageUrl] = useState("");
  const [width, setWidth] = useState(1);
  const [height, setHeight] = useState(1);
  const [isStatic, setStatic] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${BACKEND_URL}/admin/element`,
        { imageUrl, width, height, static: isStatic },
        { headers: { Authorization: `${localStorage.getItem("token")}` } }
      );
      console.log(res.data);
      setImageUrl("");
      toast("element created successfully");
    } catch (error) {
      console.error("Element creation failed", error);
    }
  };

  return (
    <div style={styles.card}>
      <h2>Create New Element</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Image URL"
          style={styles.input}
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="number"
            placeholder="Width"
            style={styles.input}
            value={width}
            onChange={(e) => setWidth(parseInt(e.target.value))}
          />
          <input
            type="number"
            placeholder="Height"
            style={styles.input}
            value={height}
            onChange={(e) => setHeight(parseInt(e.target.value))}
          />
        </div>
        <label>
          <input
            type="checkbox"
            checked={isStatic}
            onChange={(e) => setStatic(e.target.checked)}
          />
          Static Element
        </label>
        <div className="flex justify-center items-center gap-4 mt-2">
          <button
            onClick={onClick}
            className="w-[50%] h-[40px] flex justify-center items-center rounded-xl bg-blue-400 p-2"
          >
            Close
          </button>
          <button
            type="submit"
            className="w-[50%] h-[40px] flex justify-center items-center rounded-xl bg-blue-400 p-2"
          >
            Create Element
          </button>
        </div>
      </form>
    </div>
  );
};

// Map Creation Component
const MapForm = ({
  mapForm,
  setMapForm,
}: {
  mapForm: any;
  setMapForm: any;
}) => (
  <div className="flex flex-col gap-4">
    <input
      type="text"
      placeholder="Map Name"
      className="p-2 border rounded-md"
      value={mapForm.name}
      onChange={(e) => setMapForm({ ...mapForm, name: e.target.value })}
    />
    <input
      type="text"
      placeholder="Dimensions (e.g., 20x20)"
      className="p-2 border rounded-md"
      value={mapForm.dimensions}
      onChange={(e) => setMapForm({ ...mapForm, dimensions: e.target.value })}
    />
  </div>
);

const AvailableElements = ({
  availableElements,
  selectedElement,
  setSelectedElement,
}: {
  availableElements: any[];
  selectedElement: any;
  setSelectedElement: any;
}) => (
  <div>
    <h3 className="text-lg font-semibold mb-2">Available Elements</h3>
    <div className="flex gap-4 flex-wrap">
      {availableElements.map((element) => (
        <div
          key={element.id}
          className={`w-12 h-12 border rounded-md cursor-pointer ${
            selectedElement?.id === element.id
              ? "border-blue-500"
              : "border-gray-300"
          }`}
          onClick={() => setSelectedElement(element)}
        >
          <img
            src={element.imageUrl}
            alt="Element"
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  </div>
);

const Grid = ({
  mapForm,
  elements,
  handleGridClick,
}: {
  mapForm: any;
  elements: any[];
  handleGridClick: (x: number, y: number) => void;
}) => {
  const [width, height] = mapForm.dimensions.split("x").map(Number);
  console.log(elements);

  return (
    <div
      className="grid gap-1 border"
      style={{
        gridTemplateColumns: `repeat(${width}, 40px)`,
        gridTemplateRows: `repeat(${height}, 40px)`,
      }}
    >
      {Array.from({ length: width * height }).map((_, index) => {
        const x = index % width;
        const y = Math.floor(index / width);

        // Check if the cell is occupied
        const elementAtCell = elements.find((el) => el.x === x && el.y === y);

        return (
          <div
            key={index}
            className={`w-10 h-10 border cursor-pointer relative`}
            onClick={() => handleGridClick(x, y)}
          >
            {elementAtCell && (
              <img
                src={elementAtCell.element.imageUrl}
                alt="Element"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export const MapCreation = ({ onClick }: { onClick: () => void }) => {
  const [elements, setElements] = useState<any[]>([]);
  const [availableElements, setAvailableElements] = useState<any[]>([]);
  const [mapForm, setMapForm] = useState<{
    name: string;
    dimensions: string;
    thumbnail: string;
  }>({
    name: "",
    dimensions: "20x20",
    thumbnail:
      "https://cdn.gather.town/v0/b/gather-town.appspot.com/o/remote-work%2Foffice-configuration%2Fscreenshots%2FSOURCE_SPACE_RW_6.png?alt=media",
  });
  const [selectedElement, setSelectedElement] = useState<any | null>(null);

  useEffect(() => {
    const fetchElements = async () => {
      const response = await axios.get(`${BACKEND_URL}/elements`);
      setAvailableElements(response.data.elements);
      console.log(response.data.elements);
    };
    fetchElements();
  }, []);

  const handleGridClick = (x: number, y: number) => {
    const existingElement = elements.find((el) => el.x === x && el.y === y);

    if (existingElement) {
      // If an element exists at the clicked position, remove it
      setElements((prevElements) =>
        prevElements.filter((el) => el.x !== x || el.y !== y)
      );
    } else if (selectedElement) {
      // Otherwise, add the selected element to that position
      setElements((prevElements) => [
        ...prevElements,
        {
          x,
          y,
          element: selectedElement,
          elementId: selectedElement.id,
          static: selectedElement.static,
        },
      ]);
    }
  };

  //   export const CreateMapSchema = z.object({
  //     thumbnail: z.string(),
  //     dimensions: z.string().regex(/^[0-9]{1,4}x[0-9]{1,4}$/),
  //     name: z.string(),
  //     defaultElements: z.array(z.object({
  //         elementId: z.string(),
  //         x: z.number(),
  //         y: z.number(),
  //     }))
  // })
  const handleCreateMap = async () => {
    try {
      console.log(elements);

      const res = await axios.post(
        `${BACKEND_URL}/admin/map`,
        {
          thumbnail: mapForm.thumbnail,
          dimensions: mapForm.dimensions,
          name: mapForm.name,
          defaultElements: elements.map((el) => ({
            elementId: el.element.id,
            x: el.x,
            y: el.y,
            static: el.static,
          })),
        },
        {
          headers: {
            Authorization: `${localStorage.getItem("token")}`,
          },
        }
      );
      console.log(res.data);
      onClick();
      toast("Map created successfully!");
    } catch (error) {
      console.error("Error creating map:", error);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md w-full h-full overflow-scroll">
      <h2 className="text-2xl font-bold mb-4">Create New Map</h2>
      <div className="flex gap-8">
        <div className="flex-1">
          <MapForm mapForm={mapForm} setMapForm={setMapForm} />
          <AvailableElements
            availableElements={availableElements}
            selectedElement={selectedElement}
            setSelectedElement={setSelectedElement}
          />
          <div className="flex gap-4 mt-4">
            <button
              className="px-4 py-2 text-white bg-blue-500 rounded-md"
              onClick={handleCreateMap}
            >
              Create Map
            </button>
            <button
              className="px-4 py-2 text-white bg-gray-500 rounded-md"
              onClick={onClick}
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex-2">
          <Grid
            mapForm={mapForm}
            elements={elements}
            handleGridClick={handleGridClick}
          />
        </div>
      </div>
    </div>
  );
};

// Space Creation Component
export const SpaceCreation = ({ onClick }: { onClick: () => void }) => {
  const [maps, setMaps] = useState<Map[]>([]);
  const [selectedMap, setSelectedMap] = useState(maps[0]);
  const [name, setName] = useState("");
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const dimensions = `${selectedMap?.width}x${selectedMap?.height}`;
  const [spaces, setSpaces] = useRecoilState(spaceState);

  useEffect(() => {
    const fetchMaps = async () => {
      const res = await axios.get(`${BACKEND_URL}/maps`);
      console.log(res.data);
      setMaps(res.data.maps);
      setSelectedMap(res.data.maps[0]);
    };
    fetchMaps();
  }, []);

  const handleCreateSpace = async () => {
    console.log(name, dimensions, maps[selected]);
    if (name === "") {
      toast("Please enter a name for the space");
      return;
    }

    try {
      setLoading(true);

      const newSpace = await axios.post(
        `${BACKEND_URL}/space/`,
        {
          name,
          dimensions,
          mapId: maps[selected].id,
          thumbnail: maps[selected].thumbnail,
        },
        {
          headers: {
            Authorization: `${localStorage.getItem("token")}`,
          },
        }
      );
      setSpaces((prevSpaces) => [...prevSpaces, newSpace.data.space]);
      setLoading(false);
      console.log(newSpace.data);
      onClick();
      toast("Space created successfully!");
    } catch (error) {
      setLoading(false);
      console.error("Space creation failed", error);
    }
  };
  useEffect(() => {
    console.log(maps[selected]);
  }, [selected]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed top-0 left-0 w-full h-full bg-black opacity-50 z-20"></div>

      {/* Centered Popup */}
      {step === 0 ? (
        <div
          className="fixed top-1/2 left-1/2 w-[800px] h-[500px] flex flex-col justify-center items-center gap-2 shadow-lg rounded-xl z-30"
          style={{
            backgroundColor: "rgb(40, 45, 78)",
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="w-[90%] h-[90%] ">
            <div className="flex relative flex-col gap-2 h-[60px] w-full">
              <h1 className="font-bold text-xl">Choose your office template</h1>
              <p className="text-[16px] text-gray-300">
                {" "}
                Select the size and theme of your office. You can change this
                later!
              </p>
              <p
                className="text-[32px] text-white absolute top-0 right-0 cursor-pointer"
                onClick={onClick}
              >
                x
              </p>
            </div>
            <div className="w-full h-[70%] mt-6 flex ">
              <div className="w-[65%] h-full rounded-xl">
                <img
                  className="w-full h-full rounded-xl"
                  src={maps[selected]?.thumbnail}
                  alt="ldnbd"
                />
              </div>
              <div className="w-[35%] h-full flex flex-col justify-senter items-center">
                <div className="w-full h-[50%]">
                  <div className="w-full h-full p-2 mt-6 gap-2 ml-2">
                    <h1 className=" mb-2 text-xl pl-1 ">Map theme</h1>
                    <div className="w-full h-full grid grid-cols-12 gap-4 items-center justify-center">
                      <div
                        onClick={() => setSelected(0)}
                        className={`cursor-pointer col-span-6 w-[120px] h-[80px] flex justify-center items-center bg-[#545c8f] border border-gray-600 rounded-xl hover ${selected === 0 && "border-2 border-green-600"}`}
                      >
                        <span className="">🌳</span>
                        <p>Courtyard</p>
                      </div>
                      <div
                        onClick={() => setSelected(1)}
                        className={`cursor-pointer col-span-6 w-[120px] h-[80px] flex justify-center items-center bg-[#545c8f] border border-gray-600 rounded-xl ${selected === 1 && "border-2 border-green-600"}`}
                      >
                        <span className="">🏙️</span>
                        <p>Library</p>
                      </div>
                      {/* <div onClick={()=> setSelected(1)}  className={`cursor-pointer col-span-6 w-[120px] h-[80px] flex justify-center items-center bg-[#545c8f] border border-gray-600 rounded-xl ${selected ===1 && "border-2 border-green-600"}`}>
                         <span className="">🏙️</span>
                          <p>Courtyard</p>  
                         </div>
                         <div onClick={()=> setSelected(2)}  className={`cursor-pointer col-span-6 w-[120px] h-[80px] flex justify-center items-center bg-[#545c8f] border border-gray-600 rounded-xl ${selected ===2 && "border-2 border-green-600"}`}>
                         <span className="">🏠</span>
                          <p>Courtyard</p>  
                         </div>
                         <div onClick={()=> setSelected(3)}  className={`cursor-pointer col-span-6 w-[120px] h-[80px] flex justify-center items-center bg-[#545c8f] border border-gray-600 rounded-xl ${selected ===3 && "border-2 border-green-600"}`}>
                         <span className="">🚀</span>
                          <p>Courtyard</p>  
                         </div> */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full p-2 flex justify-between items-center mt-2">
              <Button
                text="Back"
                size="xl"
                color="black"
                classname=" cursor-pointer "
                onClick={onClick}
              />
              <Button
                text="Confirm Selection"
                size="xl"
                color="black"
                classname="bg-[#06D6A0] p-2 w-auto cursor-pointer "
                onClick={() => setStep(1)}
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          className="fixed top-1/2 left-1/2 w-[500px] h-[235px] flex flex-col justify-center items-center gap-2 shadow-lg rounded-xl z-30"
          style={{
            backgroundColor: "rgb(40, 45, 78)",
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="w-[90%] h-[90%] ">
            <div className="flex relative justify-center flex-col gap-2 h-[60px] w-full">
              <h1 className="font-bold text-xl">
                Create a new office space for your team
              </h1>
              <p
                className="text-[32px] text-white absolute top-0 right-0 cursor-pointer"
                onClick={onClick}
              >
                x
              </p>
            </div>
            <div className="w-full  flex flex-col gap-2">
              <p className="flex ">
                Space Name <p className="text-red-700">*</p>
              </p>
              <input
                type="text"
                onChange={(e) => {
                  setName(e.target.value);
                }}
                className="bg-transparent border border-gray-500 text-white rounded-lg h-[50px] p-2 focus:outline-none focus:ring-0"
                placeholder="Enter your Space name"
              />
            </div>

            <div className="w-full p-2 flex justify-between items-center mt-4">
              <Button
                text="Back"
                size="xl"
                color="black"
                classname=" cursor-pointer"
                onClick={() => setStep(0)}
              />
              {name.length === 0 ? (
                <Button
                  text="Create Space"
                  size="xl"
                  color="black"
                  classname="bg-[#06D6A0] p-2 w-auto"
                />
              ) : (
                <Button
                  text={loading ? "Creating..." : "Create Space"}
                  size="xl"
                  color="black"
                  classname="bg-[#06D6A0] p-2 w-auto cursor-pointer"
                  onClick={handleCreateSpace}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Main Application Component
export const SpaceManagementApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"elements" | "maps" | "spaces">(
    "elements"
  );

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "16px" }}>
      <div style={styles.tabs}>
        {["elements", "maps", "spaces"].map((tab) => (
          <button
            key={tab}
            style={{
              ...styles.tab,
              backgroundColor: activeTab === tab ? "#007bff" : "white",
              color: activeTab === tab ? "white" : "black",
            }}
            onClick={() => setActiveTab(tab as typeof activeTab)}
          >
            Create {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      {activeTab === "elements" && <ElementCreation />}
      {activeTab === "maps" && <MapCreation />}
      {activeTab === "spaces" && <SpaceCreation />}
    </div>
  );
};
