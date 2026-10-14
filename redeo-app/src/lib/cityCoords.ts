/** Approximate city-centre coordinates [lat, lng], used to draw the destination on the live-tracking map. */
export const CITY_COORDS: Record<string, [number, number]> = {
  'Casablanca': [33.5731, -7.5898], 'Rabat': [34.0209, -6.8416], 'Marrakech': [31.6295, -7.9811],
  'Tanger': [35.7595, -5.834], 'Tangier': [35.7595, -5.834], 'Agadir': [30.4278, -9.5981],
  'Fes': [34.0181, -5.0078], 'Fès': [34.0181, -5.0078], 'Oujda': [34.6867, -1.9114], 'Nador': [35.1681, -2.9335],
  'Meknes': [33.8935, -5.5473], 'Tetouan': [35.5785, -5.3684], 'El Jadida': [33.2316, -8.5007],
  'Safi': [32.2994, -9.2372], 'Kenitra': [34.261, -6.5802], 'Settat': [33.001, -7.6166], 'Berrechid': [33.2655, -7.5875],
  'Asilah': [35.465, -6.034], 'Larache': [35.1932, -6.1557], 'Mohammedia': [33.6866, -7.383], 'Essaouira': [31.5085, -9.7595],
  'Laayoune': [27.1253, -13.1625], 'Dakhla': [23.6848, -15.9579], 'Ouarzazate': [30.9189, -6.8934], 'Beni Mellal': [32.3373, -6.3498],
  'Khouribga': [32.8811, -6.9063], 'Taza': [34.21, -4.01], 'Al Hoceima': [35.2517, -3.9372], 'Chefchaouen': [35.1688, -5.2636],
};

export function cityCoords(name: string | null | undefined): [number, number] | null {
  return (name && CITY_COORDS[name.trim()]) || null;
}
