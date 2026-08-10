-- Carta Chicken Huerta transcrita sin modificar nombres ni precios.
create temporary table carta_chicken_huerta (
  categoria text not null,
  nombre text not null,
  precio numeric(12,2) not null
) on commit drop;

insert into carta_chicken_huerta (categoria, nombre, precio) values
('PARRILLADA MIXTA','DUO DE RACHI',25),
('PARRILLADA MIXTA','FILETE MOLLEJERO',24),
('PARRILLADA MIXTA','RACHI A LA PARRILLA',18),
('NUESTRO PARRILLERO RECOMIENDA','PECHUGA MONTADO A LA PARRILLA',25),
('NUESTRO PARRILLERO RECOMIENDA','CHURRASCO A LA PARRILLA',23),
('NUESTRO PARRILLERO RECOMIENDA','CHULETA A LA PARRILLA',23),
('NUESTRO PARRILLERO RECOMIENDA','FILETE DE PECHUGA',23),
('NUESTRO PARRILLERO RECOMIENDA','BROCHETA DE POLLO',20),
('NUESTRO PARRILLERO RECOMIENDA','ANTICUCHO',23),
('NUESTRO PARRILLERO RECOMIENDA','MOLLEJA A LA PARRILLA',20),
('NUESTRO PARRILLERO RECOMIENDA','FILETE DE PIERNA',25),
('NUESTRO PARRILLERO RECOMIENDA','FILETE DE PECHUGA A LA BBQ',25),
('COMBOS','CHURRASCO PARRILLERO',30),
('COMBOS','BRASA ANTICUCHERA',30),
('COMBOS','MOLLEJA PARRILLERO',25),
('COMBOS','ALITAS ACEVICHADAS',23),
('SALCHIPAPAS HUERTA','SALCHIPAPA CLASICA',12),
('SALCHIPAPAS HUERTA','SALCHICHORIZO',15),
('SALCHIPAPAS HUERTA','SALCHIHUERTA',17),
('SALCHIPAPAS HUERTA','SALCHIPAPA A LO POBRE',15),
('CHAUFAS','Chaufa de pollo',14),
('CHAUFAS','Chaufa de carne',16),
('CHAUFAS','Chaufa de chancho',15),
('CHAUFAS','Chaufa amazónico',18),
('CHAUFAS','Aeropuerto de pollo',15),
('CHAUFAS','Aeropuerto de carne',18),
('CHAUFAS','Aeropuerto de chancho',16),
('LA ESPECIALIDAD DEL CHEF','KATSU HUERTA',23),
('LA ESPECIALIDAD DEL CHEF','FETUCCINI A LA HUANCAINA',23),
('LA ESPECIALIDAD DEL CHEF','FETUCCINI A LO ALFREDO',23),
('LA ESPECIALIDAD DEL CHEF','FETUCCINI AL PESTO',23),
('BROSTER HUERTA','1/8 broster',10),
('BROSTER HUERTA','1/4 broster',16),
('BROSTER HUERTA','1/2 Pollo broster',35),
('BROSTER HUERTA','1 Pollo broster',60),
('PLATOS CRIOLLOS','Lomo saltado',22),
('PLATOS CRIOLLOS','Saltado de pollo',20),
('PLATOS CRIOLLOS','Tallarín saltado',18),
('PLATOS CRIOLLOS','Lomo Saltado a lo pobre',26),
('PLATOS CRIOLLOS','Bistec a lo pobre',25),
('PLATOS CRIOLLOS','Tacu Tacu',23),
('PARRILLAS HUERTA','PARRILLA PERSONAL',35),
('PARRILLAS HUERTA','PARRILLA DUO',45),
('PARRILLAS HUERTA','PARRILLA PARA 2 PERSONAS',60),
('PARRILLAS HUERTA','PARRILLA FAMILIA "HUERTA"',90),
('OFERTAS A LO POBRE','FILETE DE PECHUGA',25),
('OFERTAS A LO POBRE','FILETE DE PIERNA',25),
('OFERTAS A LO POBRE','CHURRASCO',25),
('OFERTAS A LO POBRE','CHULETA',25),
('ENSALADAS','ENSALADA MAGALY',20),
('ENSALADAS','ENSALADA DE CASA',18),
('SOPAS','DIETA DE POLLO',15),
('SOPAS','SOPA A LA MINUTA',18),
('BEBIDAS','Anís',3.50),
('BEBIDAS','manzanilla',3.50),
('BEBIDAS','hierva luisa',3.50),
('BEBIDAS','Gaseosa, inka Kola o coca cola 500 ml',5),
('BEBIDAS','Gaseosa inca kola o Coca cola 600 ml',6),
('BEBIDAS','Gaseosa inca kola o coca cola 296 ml',4),
('BEBIDAS','Gaseosa de 1.5 LT inca kola o coca cola',10),
('BEBIDAS','Gaseosa de 1lt inca kola o coca cola',8),
('BEBIDAS','Cerveza pilsen',12),
('BEBIDAS','Cerveza cuzqueña',13),
('BEBIDAS','Cerveza negra',15),
('BEBIDAS','Chicha morada 1L',15),
('BEBIDAS','Chicha morada 1/2 lt',7.50),
('BEBIDAS','Limonada 1lt',15),
('BEBIDAS','Limonada 1/2',7.50),
('BEBIDAS','Limonada frozen de 1 lt',18),
('BEBIDAS','Limonada frozen de 1/2 lt',9),
('BEBIDAS','Maracuyá de 1 lt',15),
('BEBIDAS','Maracuyá de 1/2 lt',7.50),
('BEBIDAS','agua san luis personal',4),
('TRAGOS 2X1','Chilcano clásico',18),
('TRAGOS 2X1','Pisco sour',18),
('TRAGOS 2X1','Machu Picchu',18),
('TRAGOS 2X1','Cuba libre',18);

-- Actualiza productos que ya existían con el precio exacto de la carta.
update public.rest_productos p
set categoria = c.categoria, precio = c.precio, activo = true
from carta_chicken_huerta c
join public.rest_empresas e on lower(coalesce(e.nombre_comercial, e.nombre)) = lower('Chicken Huerta')
where p.empresa_id = e.id
  and lower(p.nombre) = lower(c.nombre)
  and lower(p.categoria) = lower(c.categoria);

-- Agrega los restantes sin duplicar productos existentes.
insert into public.rest_productos (empresa_id, nombre, categoria, precio, stock, activo)
select e.id, c.nombre, c.categoria, c.precio, 0, true
from public.rest_empresas e
cross join carta_chicken_huerta c
where lower(coalesce(e.nombre_comercial, e.nombre)) = lower('Chicken Huerta')
  and not exists (
    select 1 from public.rest_productos p
    where p.empresa_id = e.id
      and lower(p.nombre) = lower(c.nombre)
      and lower(p.categoria) = lower(c.categoria)
  );
