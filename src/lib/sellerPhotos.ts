const SELLER_PHOTOS: Record<string, string> = {
  aline:    "/foto_vendedores/Aline (Itapipoca).jpeg",
  julia:    "/foto_vendedores/Julia.jpeg",
  kethllen: "/foto_vendedores/Kethllen.jpeg",
  leticia:  "/foto_vendedores/Leticia.jpeg",
  lucijane: "/foto_vendedores/Lucijane (Itapipoca).jpeg",
  raissa:   "/foto_vendedores/Raissa.jpeg",
  ramliz:   "/foto_vendedores/Ramliz.jpeg",
  liz:      "/foto_vendedores/Ramliz.jpeg",
};

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function getSellerPhoto(name: string): string | null {
  const norm = normalize(name);
  for (const [key, path] of Object.entries(SELLER_PHOTOS)) {
    if (norm.includes(key)) return path;
  }
  return null;
}
