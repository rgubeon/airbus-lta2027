# Operators Conference C295 & CN235 2027 · propuesta de beon. worldwide

Web estática: no necesita compilación.

## Publicar en GitHub Pages
1. Sube el contenido de esta carpeta a la raíz de un repositorio, incluido el archivo `.nojekyll`.
2. En el repositorio, ve a **Settings → Pages → Build and deployment**:
   - en **Source**, elige «Deploy from a branch»;
   - en **Branch**, elige `main` y la carpeta `/ (root)`.
3. En uno o dos minutos la web queda en `https://<usuario>.github.io/<repositorio>/`.

## Notas
- Todo va en local, sin CDN: GSAP 3.12.5, ScrollTrigger y Lenis 1.1.13 están en `lib/`, y las fuentes en `fonts/`.
- Las rutas son relativas, así que también funciona en un subdirectorio o en un dominio propio.
- Para ocultar las etiquetas «TBC», añade `#final` o `?final` a la URL.
- La página lleva `noindex` y `robots.txt` para que no la indexen los buscadores. Aun así, en GitHub Pages es pública para quien tenga el enlace.
