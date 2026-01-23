/**
 * Catálogo geográfico de Costa Rica
 * Estructura: Provincia > Cantón > Distrito
 */

export interface Distrito {
  codigo: string;
  nombre: string;
  codigoPostal: string; // Primer código postal del distrito (para validación)
}

export interface Canton {
  codigo: string;
  nombre: string;
  distritos: Distrito[];
}

export interface Provincia {
  codigo: string;
  nombre: string;
  cantones: Canton[];
}

export const costaRica: Provincia[] = [
  {
    codigo: "1",
    nombre: "San José",
    cantones: [
      {
        codigo: "01",
        nombre: "San José",
        distritos: [
          { codigo: "01", nombre: "Carmen", codigoPostal: "10101" },
          { codigo: "02", nombre: "Merced", codigoPostal: "10102" },
          { codigo: "03", nombre: "Hospital", codigoPostal: "10103" },
          { codigo: "04", nombre: "Catedral", codigoPostal: "10104" },
          { codigo: "05", nombre: "Zapote", codigoPostal: "10105" },
          { codigo: "06", nombre: "San Francisco de Dos Ríos", codigoPostal: "10106" },
          { codigo: "07", nombre: "Uruca", codigoPostal: "10107" },
          { codigo: "08", nombre: "Mata Redonda", codigoPostal: "10108" },
          { codigo: "09", nombre: "Pavas", codigoPostal: "10109" },
          { codigo: "10", nombre: "Hatillo", codigoPostal: "10110" },
          { codigo: "11", nombre: "San Sebastián", codigoPostal: "10111" },
        ],
      },
      {
        codigo: "02",
        nombre: "Escazú",
        distritos: [
          { codigo: "01", nombre: "Escazú", codigoPostal: "10201" },
          { codigo: "02", nombre: "San Antonio", codigoPostal: "10202" },
          { codigo: "03", nombre: "San Rafael", codigoPostal: "10203" },
        ],
      },
      {
        codigo: "03",
        nombre: "Desamparados",
        distritos: [
          { codigo: "01", nombre: "Desamparados", codigoPostal: "10301" },
          { codigo: "02", nombre: "San Miguel", codigoPostal: "10302" },
          { codigo: "03", nombre: "San Juan de Dios", codigoPostal: "10303" },
        ],
      },
      {
        codigo: "04",
        nombre: "Curridabat",
        distritos: [
          { codigo: "01", nombre: "Curridabat", codigoPostal: "10401" },
          { codigo: "02", nombre: "Granadilla", codigoPostal: "10402" },
          { codigo: "03", nombre: "Sánchez", codigoPostal: "10403" },
        ],
      },
    ],
  },
  {
    codigo: "2",
    nombre: "Alajuela",
    cantones: [
      {
        codigo: "01",
        nombre: "Alajuela",
        distritos: [
          { codigo: "01", nombre: "Alajuela", codigoPostal: "20101" },
          { codigo: "02", nombre: "San José", codigoPostal: "20102" },
          { codigo: "03", nombre: "Carrizal", codigoPostal: "20103" },
        ],
      },
      {
        codigo: "02",
        nombre: "Grecia",
        distritos: [
          { codigo: "01", nombre: "Grecia", codigoPostal: "20301" },
          { codigo: "02", nombre: "San Isidro", codigoPostal: "20302" },
          { codigo: "03", nombre: "San José", codigoPostal: "20303" },
        ],
      },
      {
        codigo: "03",
        nombre: "San Ramón",
        distritos: [
          { codigo: "01", nombre: "San Ramón", codigoPostal: "20201" },
          { codigo: "02", nombre: "Santiago", codigoPostal: "20202" },
        ],
      },
    ],
  },
  {
    codigo: "3",
    nombre: "Cartago",
    cantones: [
      {
        codigo: "01",
        nombre: "Cartago",
        distritos: [
          { codigo: "01", nombre: "Oriental", codigoPostal: "30101" },
          { codigo: "02", nombre: "Occidental", codigoPostal: "30102" },
          { codigo: "03", nombre: "Carmen", codigoPostal: "30103" },
          { codigo: "04", nombre: "San Nicolás", codigoPostal: "30104" },
          { codigo: "05", nombre: "Aguacaliente", codigoPostal: "30105" },
          { codigo: "06", nombre: "Guadalupe", codigoPostal: "30106" },
          { codigo: "07", nombre: "Corralillo", codigoPostal: "30107" },
          { codigo: "08", nombre: "Tierra Blanca", codigoPostal: "30108" },
          { codigo: "09", nombre: "Dulce Nombre", codigoPostal: "30109" },
          { codigo: "10", nombre: "Llano Grande", codigoPostal: "30110" },
          { codigo: "11", nombre: "Quebradilla", codigoPostal: "30111" },
        ],
      },
      {
        codigo: "02",
        nombre: "Paraíso",
        distritos: [
          { codigo: "01", nombre: "Paraíso", codigoPostal: "30201" },
          { codigo: "02", nombre: "Santiago", codigoPostal: "30202" },
          { codigo: "03", nombre: "Orosi", codigoPostal: "30203" },
          { codigo: "04", nombre: "Cachí", codigoPostal: "30204" },
          { codigo: "05", nombre: "Llanos de Santa Lucía", codigoPostal: "30205" },
        ],
      },
      {
        codigo: "03",
        nombre: "La Unión",
        distritos: [
          { codigo: "01", nombre: "Tres Ríos", codigoPostal: "30301" },
          { codigo: "02", nombre: "San Diego", codigoPostal: "30302" },
          { codigo: "03", nombre: "San Juan", codigoPostal: "30303" },
          { codigo: "04", nombre: "San Rafael", codigoPostal: "30304" },
          { codigo: "05", nombre: "Concepción", codigoPostal: "30305" },
          { codigo: "06", nombre: "Dulce Nombre", codigoPostal: "30306" },
          { codigo: "07", nombre: "San Ramón", codigoPostal: "30307" },
          { codigo: "08", nombre: "Río Azul", codigoPostal: "30308" },
        ],
      },
      {
        codigo: "04",
        nombre: "Jiménez",
        distritos: [
          { codigo: "01", nombre: "Juan Viñas", codigoPostal: "30401" },
          { codigo: "02", nombre: "Tucurrique", codigoPostal: "30402" },
          { codigo: "03", nombre: "Pejibaye", codigoPostal: "30403" },
        ],
      },
      {
        codigo: "05",
        nombre: "Turrialba",
        distritos: [
          { codigo: "01", nombre: "Turrialba", codigoPostal: "30501" },
          { codigo: "02", nombre: "La Suiza", codigoPostal: "30502" },
          { codigo: "03", nombre: "Peralta", codigoPostal: "30503" },
          { codigo: "04", nombre: "Santa Cruz", codigoPostal: "30504" },
          { codigo: "05", nombre: "Santa Teresita", codigoPostal: "30505" },
          { codigo: "06", nombre: "Pavones", codigoPostal: "30506" },
          { codigo: "07", nombre: "Tuis", codigoPostal: "30507" },
          { codigo: "08", nombre: "Tayutic", codigoPostal: "30508" },
          { codigo: "09", nombre: "Santa Rosa", codigoPostal: "30509" },
          { codigo: "10", nombre: "Tres Equis", codigoPostal: "30510" },
          { codigo: "11", nombre: "La Isabel", codigoPostal: "30511" },
          { codigo: "12", nombre: "Chirripó", codigoPostal: "30512" },
        ],
      },
      {
        codigo: "06",
        nombre: "Alvarado",
        distritos: [
          { codigo: "01", nombre: "Pacayas", codigoPostal: "30601" },
          { codigo: "02", nombre: "Cervantes", codigoPostal: "30602" },
          { codigo: "03", nombre: "Capellades", codigoPostal: "30603" },
        ],
      },
      {
        codigo: "07",
        nombre: "Oreamuno",
        distritos: [
          { codigo: "01", nombre: "San Rafael", codigoPostal: "30701" },
          { codigo: "02", nombre: "Cot", codigoPostal: "30702" },
          { codigo: "03", nombre: "Potrero Cerrado", codigoPostal: "30703" },
          { codigo: "04", nombre: "Cipreses", codigoPostal: "30704" },
          { codigo: "05", nombre: "Santa Rosa", codigoPostal: "30705" },
        ],
      },
      {
        codigo: "08",
        nombre: "El Guarco",
        distritos: [
          { codigo: "01", nombre: "El Tejar", codigoPostal: "30801" },
          { codigo: "02", nombre: "San Isidro", codigoPostal: "30802" },
          { codigo: "03", nombre: "Tobosi", codigoPostal: "30803" },
          { codigo: "04", nombre: "Patiloñiles", codigoPostal: "30804" },
        ],
      },
    ],
  },
  {
    codigo: "4",
    nombre: "Heredia",
    cantones: [
      {
        codigo: "01",
        nombre: "Heredia",
        distritos: [
          { codigo: "01", nombre: "Heredia", codigoPostal: "40101" },
          { codigo: "02", nombre: "Mercedes", codigoPostal: "40102" },
        ],
      },
    ],
  },
  {
    codigo: "5",
    nombre: "Guanacaste",
    cantones: [
      {
        codigo: "01",
        nombre: "Liberia",
        distritos: [
          { codigo: "01", nombre: "Liberia", codigoPostal: "50101" },
        ],
      },
    ],
  },
  {
    codigo: "6",
    nombre: "Puntarenas",
    cantones: [
      {
        codigo: "01",
        nombre: "Puntarenas",
        distritos: [
          { codigo: "01", nombre: "Puntarenas", codigoPostal: "60101" },
        ],
      },
    ],
  },
  {
    codigo: "7",
    nombre: "Limón",
    cantones: [
      {
        codigo: "01",
        nombre: "Limón",
        distritos: [
          { codigo: "01", nombre: "Limón", codigoPostal: "70101" },
        ],
      },
    ],
  },
];

/**
 * Helper: Obtener provincia por código
 */
export function getProvinciaByCodigo(codigo: string): Provincia | undefined {
  return costaRica.find((p) => p.codigo === codigo);
}

/**
 * Helper: Obtener cantones de una provincia
 */
export function getCantonesByProvincia(provinciaCodigo: string): Canton[] {
  const provincia = getProvinciaByCodigo(provinciaCodigo);
  return provincia?.cantones || [];
}

/**
 * Helper: Obtener distritos de un cantón
 */
export function getDistritosByCanton(
  provinciaCodigo: string,
  cantonCodigo: string
): Distrito[] {
  const provincia = getProvinciaByCodigo(provinciaCodigo);
  const canton = provincia?.cantones.find((c) => c.codigo === cantonCodigo);
  return canton?.distritos || [];
}

/**
 * Helper: Validar si un código postal coincide con provincia/cantón/distrito
 * 
 * Valida que el código postal tenga el formato correcto según la estructura:
 * - Primer dígito: Provincia
 * - Dígitos 2-3: Cantón
 * - Dígitos 4-5: Distrito
 */
export function validarCodigoPostal(
  codigoPostal: string,
  provinciaCodigo: string,
  cantonCodigo: string,
  distritoCodigo: string
): boolean {
  if (codigoPostal.length !== 5) return false;
  
  const distritos = getDistritosByCanton(provinciaCodigo, cantonCodigo);
  const distrito = distritos.find((d) => d.codigo === distritoCodigo);
  
  if (!distrito) return false;
  
  // Validar que el código postal coincida con el distrito seleccionado
  // Comparar los primeros 3 dígitos (provincia + cantón) y el distrito completo
  const codigoEsperado = distrito.codigoPostal;
  
  // Verificar que coincida exactamente o al menos el prefijo de provincia+cantón
  return codigoPostal === codigoEsperado || 
         codigoPostal.substring(0, 3) === codigoEsperado.substring(0, 3);
}
