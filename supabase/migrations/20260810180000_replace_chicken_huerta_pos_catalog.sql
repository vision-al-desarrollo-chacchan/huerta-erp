-- Reemplaza por completo el catalogo del POS de Chicken Huerta.
-- Los items de pedidos historicos conservan nombre y precio; su producto_id queda nulo.

do $$
declare
  v_empresa_id uuid;
  v_insertados integer;
begin
  select id into v_empresa_id
  from public.rest_empresas
  where lower(coalesce(nombre_comercial, nombre)) = lower('Chicken Huerta')
  order by created_at
  limit 1;

  if v_empresa_id is null then
    raise exception 'No se encontro la empresa Chicken Huerta';
  end if;

  delete from public.rest_productos
  where empresa_id = v_empresa_id;

  insert into public.rest_productos (empresa_id, nombre, categoria, precio, stock, activo)
  select v_empresa_id, nombre, categoria, precio, 0, true
  from (values
    ('PARRILLADA MIXTA','DUO DE RACHI',25.00),
    ('PARRILLADA MIXTA','FILETE MOLLEJERO',24.00),
    ('PARRILLADA MIXTA','RACHI A LA PARRILLA',18.00),
    ('NUESTRO PARRILLERO RECOMIENDA','PECHUGA MONTADO A LA PARRILLA',25.00),
    ('NUESTRO PARRILLERO RECOMIENDA','CHURRASCO A LA PARRILLA',23.00),
    ('NUESTRO PARRILLERO RECOMIENDA','CHULETA A LA PARRILLA',23.00),
    ('NUESTRO PARRILLERO RECOMIENDA','FILETE DE PECHUGA',23.00),
    ('NUESTRO PARRILLERO RECOMIENDA','BROCHETA DE POLLO',20.00),
    ('NUESTRO PARRILLERO RECOMIENDA','ANTICUCHO',23.00),
    ('NUESTRO PARRILLERO RECOMIENDA','MOLLEJA A LA PARRILLA',20.00),
    ('NUESTRO PARRILLERO RECOMIENDA','FILETE DE PIERNA',25.00),
    ('NUESTRO PARRILLERO RECOMIENDA','FILETE DE PECHUGA A LA BBQ',25.00),
    ('COMBOS','CHURRASCO PARRILLERO',30.00),
    ('COMBOS','BRASA ANTICUCHERA',30.00),
    ('COMBOS','MOLLEJA PARRILLERO',25.00),
    ('COMBOS','ALITAS ACEVICHADAS',23.00),
    ('SALCHIPAPAS HUERTA','SALCHIPAPA CLASICA',12.00),
    ('SALCHIPAPAS HUERTA','SALCHICHORIZO',15.00),
    ('SALCHIPAPAS HUERTA','SALCHIHUERTA',17.00),
    ('SALCHIPAPAS HUERTA','SALCHIPAPA A LO POBRE',15.00),
    ('CHAUFAS','Chaufa de pollo',14.00),
    ('CHAUFAS','Chaufa de carne',16.00),
    ('CHAUFAS','Chaufa de chancho',15.00),
    ('CHAUFAS','Chaufa amazónico',18.00),
    ('CHAUFAS','Aeropuerto de pollo',15.00),
    ('CHAUFAS','Aeropuerto de carne',18.00),
    ('CHAUFAS','Aeropuerto de chancho',16.00),
    ('LA ESPECIALIDAD DEL CHEF','KATSU HUERTA',23.00),
    ('LA ESPECIALIDAD DEL CHEF','FETUCCINI A LA HUANCAINA',23.00),
    ('LA ESPECIALIDAD DEL CHEF','FETUCCINI A LO ALFREDO',23.00),
    ('LA ESPECIALIDAD DEL CHEF','FETUCCINI AL PESTO',23.00),
    ('BROSTER HUERTA','1/8 broster',10.00),
    ('BROSTER HUERTA','1/4 broster',16.00),
    ('BROSTER HUERTA','1/2 Pollo broster',35.00),
    ('BROSTER HUERTA','1 Pollo broster',60.00),
    ('PLATOS CRIOLLOS','Lomo saltado',22.00),
    ('PLATOS CRIOLLOS','Saltado de pollo',20.00),
    ('PLATOS CRIOLLOS','Tallarín saltado',18.00),
    ('PLATOS CRIOLLOS','Lomo Saltado a lo pobre',26.00),
    ('PLATOS CRIOLLOS','Bistec a lo pobre',25.00),
    ('PLATOS CRIOLLOS','Tacu Tacu',23.00),
    ('PARRILLAS HUERTA','PARRILLA PERSONAL',35.00),
    ('PARRILLAS HUERTA','PARRILLA DUO',45.00),
    ('PARRILLAS HUERTA','PARRILLA PARA 2 PERSONAS',60.00),
    ('PARRILLAS HUERTA','PARRILLA FAMILIA "HUERTA"',90.00),
    ('OFERTAS A LO POBRE','FILETE DE PECHUGA',25.00),
    ('OFERTAS A LO POBRE','FILETE DE PIERNA',25.00),
    ('OFERTAS A LO POBRE','CHURRASCO',25.00),
    ('OFERTAS A LO POBRE','CHULETA',25.00),
    ('ENSALADAS','ENSALADA MAGALY',20.00),
    ('ENSALADAS','ENSALADA DE CASA',18.00),
    ('SOPAS','DIETA DE POLLO',15.00),
    ('SOPAS','SOPA A LA MINUTA',18.00),
    ('BEBIDAS','Anís',3.50),
    ('BEBIDAS','manzanilla',3.50),
    ('BEBIDAS','hierva luisa',3.50),
    ('BEBIDAS','Gaseosa, inka Kola o coca cola 500 ml',5.00),
    ('BEBIDAS','Gaseosa inca kola o Coca cola 600 ml',6.00),
    ('BEBIDAS','Gaseosa inca kola o coca cola 296 ml',4.00),
    ('BEBIDAS','Gaseosa de 1.5 LT inca kola o coca cola',10.00),
    ('BEBIDAS','Gaseosa de 1lt inca kola o coca cola',8.00),
    ('BEBIDAS','Cerveza pilsen',12.00),
    ('BEBIDAS','Cerveza cuzqueña',13.00),
    ('BEBIDAS','Cerveza negra',15.00),
    ('BEBIDAS','Chicha morada 1L',15.00),
    ('BEBIDAS','Chicha morada 1/2 lt',7.50),
    ('BEBIDAS','Limonada 1lt',15.00),
    ('BEBIDAS','Limonada 1/2',7.50),
    ('BEBIDAS','Limonada frozen de 1 lt',18.00),
    ('BEBIDAS','Limonada frozen de 1/2 lt',9.00),
    ('BEBIDAS','Maracuyá de 1 lt',15.00),
    ('BEBIDAS','Maracuyá de 1/2 lt',7.50),
    ('BEBIDAS','agua san luis personal',4.00),
    ('TRAGOS 2X1','Chilcano clásico',18.00),
    ('TRAGOS 2X1','Pisco sour',18.00),
    ('TRAGOS 2X1','Machu Picchu',18.00),
    ('TRAGOS 2X1','Cuba libre',18.00)
  ) as carta(categoria, nombre, precio);

  get diagnostics v_insertados = row_count;
  if v_insertados <> 77 then
    raise exception 'Catalogo incompleto: se insertaron % productos, se esperaban 77', v_insertados;
  end if;

  if exists (
    select 1
    from public.rest_productos
    where empresa_id = v_empresa_id
    group by lower(nombre), lower(categoria)
    having count(*) > 1
  ) then
    raise exception 'El catalogo contiene productos duplicados';
  end if;
end
$$;
