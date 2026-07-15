/* Camada própria de categorias de localização (spec §7/§8) — PURA, sem IO, testada na
   suíte. O resto do sistema depende DESTAS categorias, nunca das tags cruas do OSM.
   Cada categoria tem o SEU raio relevante (§8: padaria ≠ hospital ≠ aeroporto) e um
   sinal (positivo = amenidade; atencao = externalidade que pede leitura humana). */

export const RAIOS_M = {
  supermarket: 1000, bakery: 500, pharmacy: 1000, school: 1500, daycare: 1000,
  university: 3000, hospital: 3000, clinic: 2000, gym: 1000, park: 1000,
  square: 800, restaurant: 1000, shopping_center: 3000, bank: 1500,
  fuel_station: 1000, bus_stop: 500, nightlife: 500, industrial_area: 1500,
  cemetery: 1000,
};

export const SINAL = {
  nightlife: "atencao", industrial_area: "atencao", cemetery: "atencao", fuel_station: "atencao",
};

export const ROTULO = {
  supermarket: "Supermercados", bakery: "Padarias", pharmacy: "Farmácias", school: "Escolas",
  daycare: "Creches", university: "Universidades", hospital: "Hospitais", clinic: "Clínicas",
  gym: "Academias", park: "Parques", square: "Praças", restaurant: "Restaurantes",
  shopping_center: "Shoppings", bank: "Bancos", fuel_station: "Postos de combustível",
  bus_stop: "Pontos de ônibus", nightlife: "Vida noturna", industrial_area: "Área industrial",
  cemetery: "Cemitérios",
};

/* tag OSM -> categoria interna (1ª fonte; Google Places entraria aqui como 2º mapa) */
export function categoriaDeTags(t) {
  if (!t) return null;
  if (t.shop === "supermarket") return "supermarket";
  if (t.shop === "bakery") return "bakery";
  if (t.shop === "mall") return "shopping_center";
  if (t.amenity === "pharmacy") return "pharmacy";
  if (t.amenity === "school") return "school";
  if (t.amenity === "kindergarten") return "daycare";
  if (t.amenity === "university" || t.amenity === "college") return "university";
  if (t.amenity === "hospital") return "hospital";
  if (t.amenity === "clinic" || t.amenity === "doctors") return "clinic";
  if (t.leisure === "fitness_centre") return "gym";
  if (t.leisure === "park") return "park";
  if (t.place === "square") return "square";
  if (t.amenity === "restaurant" || t.amenity === "fast_food") return "restaurant";
  if (t.amenity === "bank") return "bank";
  if (t.amenity === "fuel") return "fuel_station";
  if (t.highway === "bus_stop") return "bus_stop";
  if (t.amenity === "bar" || t.amenity === "nightclub" || t.amenity === "pub") return "nightlife";
  if (t.landuse === "industrial") return "industrial_area";
  if (t.landuse === "cemetery" || t.amenity === "grave_yard") return "cemetery";
  return null;
}
