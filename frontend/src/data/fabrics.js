export const API_BASE = "http://localhost:8000";

export const FABRIC_CATEGORIES = [
  {
    id: "sheerSolar",
    nameKey: "fabric.sheerSolar",
    descKey: "fabric.sheerSolar.desc",
    styles: [
      { id: "sheerSolar1", thumbnail: "/resources/sheerSolar1-2.jpg", detail: "/resources/sheerSolar1-1.jpg", ref: "sheerSolar1-1.jpg" },
      { id: "sheerSolar2", thumbnail: "/resources/sheerSolar2-2.jpg", detail: "/resources/sheerSolar2-1.jpg", ref: "sheerSolar2-1.jpg" },
      { id: "sheerSolar3", thumbnail: "/resources/sheerSolar3-2.jpg", detail: "/resources/sheerSolar3-1.jpg", ref: "sheerSolar3-1.jpg" },
    ],
  },
  {
    id: "sheerPrivacy",
    nameKey: "fabric.sheerPrivacy",
    descKey: "fabric.sheerPrivacy.desc",
    styles: [
      { id: "sheerPrivacy1", thumbnail: "/resources/sheerPrivacy1-2.png", detail: "/resources/sheerPrivacy1-1.png", ref: "sheerPrivacy1-1.png" },
      { id: "sheerPrivacy2", thumbnail: "/resources/sheerPrivacy2-2.png", detail: "/resources/sheerPrivacy2-1.png", ref: "sheerPrivacy2-1.png" },
    ],
  },
  {
    id: "sheerDurable",
    nameKey: "fabric.sheerDurable",
    descKey: "fabric.sheerDurable.desc",
    styles: [
      { id: "sheerDurable1", thumbnail: "/resources/sheerDurable1-2.png", detail: "/resources/sheerDurable1-1.png", ref: "sheerDurable1-1.png" },
    ],
  },
];

export const PLEAT_OPTIONS = [
  { value: 1.5, labelKey: "pleat.1_5" },
  { value: 2, labelKey: "pleat.2" },
  { value: 2.5, labelKey: "pleat.2_5" },
];

export const ARRANGEMENT_OPTIONS = [
  { id: "double", labelKey: "arrangement.double" },
  { id: "left", labelKey: "arrangement.left" },
  { id: "right", labelKey: "arrangement.right" },
];

export const INSTALLATION_OPTIONS = [
  { id: "plafond", labelKey: "installation.plafond" },
  { id: "cadre", labelKey: "installation.cadre" },
  { id: "tringle", labelKey: "installation.tringle" },
];
