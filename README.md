# Huerta ERP

Aplicación de gestión empresarial desarrollada con React, TypeScript, Vite y Supabase.

## Requisitos

- Node.js 22.12 o superior
- npm

## Desarrollo local

```bash
npm install
npm run dev
```

## Verificaciones

```bash
npm run lint
npm run build
npm run preview
```

El build de producción se genera en `dist`.

## Cloudflare Pages

Configura el proyecto con estos valores:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js version: `22.12.0` o una versión 22 posterior

El archivo `public/_redirects` se copia automáticamente al build y permite recargar rutas de React Router sin errores 404.

## Supabase

El acceso al panel requiere una sesión válida de Supabase. Antes de publicar, confirma en Supabase Authentication que la URL de producción de Cloudflare esté autorizada cuando actives recuperación de contraseña, OAuth o enlaces enviados por correo.

Las migraciones versionadas están en `supabase/migrations`. La migración
`20260808220000_restaurant_core.sql` crea el núcleo gastronómico multiempresa,
las políticas RLS, el alta inicial de Chicken Huerta y el flujo seguro de pedidos.
