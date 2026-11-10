"""Seed reproducible para TP-U1a4 (API Librería) con soporte de paginación completa.

C-08: Banco de datos representativo con más de 25 libros, 12 clientes y 20 ventas
para validación de paginación (offset/limit), filtros y visualización móvil.
Uso: python seed_db.py (o docker compose exec backend python seed_db.py)
"""

import asyncio
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import build_engine, build_session_factory
from app.modules.autores.models import Autor
from app.modules.clientes.models import Cliente, PerfilCliente
from app.modules.editoriales.models import Editorial
from app.modules.generos.models import Genero
from app.modules.libros.models import Libro, LibroAutor
from app.modules.ventas.models import RenglonVenta, Venta


async def seed() -> None:
    settings = get_settings()
    engine = build_engine(settings.database_url, sql_echo=False)
    session_factory = build_session_factory(engine)

    async with session_factory() as session:
        # Limpieza previa para que el seed sea idempotente y reproducible
        await session.execute(
            text(
                "TRUNCATE TABLE renglon_venta, venta, perfil_cliente, cliente, "
                "libro_autor, libro, genero, autor, editorial RESTART IDENTITY CASCADE"
            )
        )
        await session.commit()

        # 1. Editoriales
        editoriales = [
            Editorial(nombre="Editorial Planeta", pais="Argentina"),
            Editorial(nombre="Editorial Sudamericana", pais="Argentina"),
            Editorial(nombre="Penguin Random House", pais="EE.UU"),
            Editorial(nombre="Alfaguara", pais="España"),
            Editorial(nombre="Anagrama", pais="España"),
            Editorial(nombre="Alianza Editorial", pais="España"),
        ]
        session.add_all(editoriales)
        await session.commit()
        for e in editoriales:
            await session.refresh(e)

        # 2. Géneros
        generos = [
            Genero(nombre="Ficción"),
            Genero(nombre="No Ficción"),
            Genero(nombre="Ciencia Ficción"),
            Genero(nombre="Novela Policial"),
            Genero(nombre="Terror"),
            Genero(nombre="Poesía"),
        ]
        session.add_all(generos)
        await session.commit()
        for g in generos:
            await session.refresh(g)

        # 3. Autores
        autores = [
            Autor(nombre="Jorge Luis Borges", nacionalidad="Argentina"),
            Autor(nombre="Julio Cortázar", nacionalidad="Argentina"),
            Autor(nombre="Isabel Allende", nacionalidad="Chile"),
            Autor(nombre="Gabriel García Márquez", nacionalidad="Colombia"),
            Autor(nombre="Ernesto Sabato", nacionalidad="Argentina"),
            Autor(nombre="Mariana Enríquez", nacionalidad="Argentina"),
            Autor(nombre="George Orwell", nacionalidad="Reino Unido"),
            Autor(nombre="Franz Kafka", nacionalidad="República Checa"),
            Autor(nombre="Virginia Woolf", nacionalidad="Reino Unido"),
            Autor(nombre="Arthur Conan Doyle", nacionalidad="Reino Unido"),
        ]
        session.add_all(autores)
        await session.commit()
        for a in autores:
            await session.refresh(a)

        # 4. Libros (26 títulos para habilitar 3 páginas en catálogo con PAGE_LIMIT=12)
        libros_data = [
            ("978-950-12-3401-1", "El Aleph", "45.00", 15, 0, 0, [(0, "autor", 1)]),
            ("978-950-12-3402-2", "Ficciones", "48.00", 18, 0, 0, [(0, "autor", 1)]),
            ("978-950-12-3403-3", "Inquisiciones", "35.00", 8, 1, 1, [(0, "autor", 1)]),
            ("978-950-12-3404-4", "Rayuela", "55.00", 12, 0, 0, [(1, "autor", 1), (0, "coautor", 2)]),
            ("978-950-12-3405-5", "Bestiario", "42.00", 20, 3, 0, [(1, "autor", 1)]),
            ("978-950-12-3406-6", "Final del juego", "39.00", 14, 1, 0, [(1, "autor", 1)]),
            ("978-950-12-3407-7", "La casa de los espíritus", "38.50", 22, 1, 0, [(2, "autor", 1)]),
            ("978-950-12-3408-8", "De amor y de sombra", "36.00", 10, 1, 0, [(2, "autor", 1)]),
            ("978-950-12-3409-9", "Cien años de soledad", "42.00", 25, 2, 0, [(3, "autor", 1)]),
            ("978-950-12-3410-0", "Crónica de una muerte anunciada", "34.00", 30, 2, 3, [(3, "autor", 1)]),
            ("978-950-12-3411-1", "El amor en los tiempos del cólera", "46.00", 16, 3, 0, [(3, "autor", 1)]),
            ("978-950-12-3412-2", "Sobre héroes y tumbas", "44.00", 11, 0, 0, [(4, "autor", 1)]),
            ("978-950-12-3413-3", "El túnel", "32.00", 19, 0, 3, [(4, "autor", 1)]),
            ("978-950-12-3414-4", "Nuestra parte de noche", "58.00", 17, 4, 4, [(5, "autor", 1)]),
            ("978-950-12-3415-5", "Las cosas que perdimos en el fuego", "41.00", 15, 4, 4, [(5, "autor", 1)]),
            ("978-950-12-3416-6", "1984", "40.00", 28, 2, 2, [(6, "autor", 1)]),
            ("978-950-12-3417-7", "Rebelión en la granja", "29.00", 24, 2, 0, [(6, "autor", 1)]),
            ("978-950-12-3418-8", "Homenaje a Cataluña", "37.00", 9, 5, 1, [(6, "autor", 1)]),
            ("978-950-12-3419-9", "La metamorfosis", "25.00", 35, 5, 0, [(7, "autor", 1)]),
            ("978-950-12-3420-0", "El proceso", "33.00", 14, 5, 0, [(7, "autor", 1)]),
            ("978-950-12-3421-1", "La señora Dalloway", "38.00", 12, 1, 0, [(8, "autor", 1)]),
            ("978-950-12-3422-2", "Al faro", "36.50", 10, 1, 0, [(8, "autor", 1)]),
            ("978-950-12-3423-3", "Estudio en escarlata", "28.00", 21, 4, 3, [(9, "autor", 1)]),
            ("978-950-12-3424-4", "El sabueso de los Baskerville", "31.00", 18, 4, 3, [(9, "autor", 1)]),
            ("978-950-12-3425-5", "Antología Poética", "27.00", 16, 0, 5, [(0, "autor", 1)]),
            ("978-950-12-3426-6", "Todos los fuegos el fuego", "39.50", 13, 3, 0, [(1, "autor", 1)]),
        ]

        libros = []
        autorias = []
        for isbn, titulo, precio, stock, ed_idx, gen_idx, auts in libros_data:
            libro = Libro(
                isbn=isbn,
                titulo=titulo,
                precio=Decimal(precio),
                stock=stock,
                editorial_id=editoriales[ed_idx].id,
                genero_id=generos[gen_idx].id,
            )
            libros.append((libro, auts))
            session.add(libro)

        await session.commit()
        for l, _ in libros:
            await session.refresh(l)

        # 5. LibroAutor associations
        for libro_obj, aut_list in libros:
            for aut_idx, rol, orden in aut_list:
                autorias.append(
                    LibroAutor(
                        libro_id=libro_obj.id,
                        autor_id=autores[aut_idx].id,
                        rol=rol,
                        orden=orden,
                    )
                )
        session.add_all(autorias)
        await session.commit()

        # 6. Clientes con perfiles (12 clientes para poblar vista clientes)
        clientes_raw = [
            ("María García", "maria.garcia@test.com", "+54 9 11 1234-5678", "Av. Santa Fe 1234, CABA"),
            ("Carlos Rodríguez", "carlos.rodriguez@test.com", "+54 9 11 2345-6789", "Av. Corrientes 2450, CABA"),
            ("Lucía Fernández", "lucia.fernandez@test.com", "+54 9 261 456-7890", "San Martín 820, Mendoza"),
            ("Juan Pérez", "juan.perez@test.com", "+54 9 351 567-8901", "Bv. Chacabuco 400, Córdoba"),
            ("Ana Martínez", "ana.martinez@test.com", "+54 9 341 678-9012", "Pellegrini 1500, Rosario"),
            ("Diego Gómez", "diego.gomez@test.com", "+54 9 11 7890-1234", "Callao 890, CABA"),
            ("Valentina Díaz", "valentina.diaz@test.com", "+54 9 261 890-1234", "Belgrano 1120, Mendoza"),
            ("Matías López", "matias.lopez@test.com", "+54 9 351 901-2345", "Colón 750, Córdoba"),
            ("Sofía Benítez", "sofia.benitez@test.com", "+54 9 11 3456-7890", "Cabildo 3200, CABA"),
            ("Lucas Romero", "lucas.romero@test.com", "+54 9 341 456-7890", "Córdoba 1800, Rosario"),
            ("Camila Torres", "camila.torres@test.com", "+54 9 261 567-8901", "Arístides 450, Mendoza"),
            ("Martín Morales", "martin.morales@test.com", "+54 9 11 6789-0123", "Rivadavia 4500, CABA"),
        ]

        clientes = []
        for nombre, email, tel, dir_str in clientes_raw:
            cli = Cliente(nombre=nombre, email=email)
            session.add(cli)
            await session.commit()
            await session.refresh(cli)
            perfil = PerfilCliente(cliente_id=cli.id, telefono=tel, direccion=dir_str)
            session.add(perfil)
            clientes.append(cli)

        await session.commit()

        # 7. Ventas (20 ventas para habilitar paginación con PAGE_LIMIT=15)
        # Fechas escalonadas en los últimos 10 días
        now = datetime.now(timezone.utc)
        created_books = [l for l, _ in libros]

        ventas_specs = [
            (0, [(0, 1), (1, 1)]),
            (1, [(3, 1)]),
            (2, [(6, 2)]),
            (3, [(8, 1), (9, 2)]),
            (4, [(12, 1)]),
            (5, [(15, 2), (16, 1)]),
            (6, [(18, 3)]),
            (7, [(13, 1), (14, 1)]),
            (8, [(22, 1), (23, 1)]),
            (9, [(2, 1)]),
            (10, [(4, 2)]),
            (11, [(10, 1)]),
            (0, [(17, 1)]),
            (1, [(19, 1), (20, 1)]),
            (2, [(21, 1)]),
            (3, [(5, 2)]),
            (4, [(7, 1)]),
            (5, [(11, 1)]),
            (6, [(24, 2)]),
            (7, [(25, 1), (0, 1)]),
        ]

        for i, (cli_idx, items) in enumerate(ventas_specs):
            venta_time = now - timedelta(days=9 - (i // 2), hours=(i % 6) * 3)
            renglones = []
            total = Decimal("0.00")
            for book_idx, qty in items:
                b = created_books[book_idx]
                pu = b.precio
                sub = pu * Decimal(str(qty))
                total += sub
                renglones.append(
                    RenglonVenta(
                        libro_id=b.id,
                        cantidad=qty,
                        precio_unitario=pu,
                    )
                )
            v = Venta(
                cliente_id=clientes[cli_idx].id,
                fecha=venta_time,
                total=total,
                renglones=renglones,
            )
            session.add(v)

        await session.commit()

        print("[OK] Seed masivo completado exitosamente")
        print(f"   - {len(editoriales)} editoriales")
        print(f"   - {len(generos)} géneros")
        print(f"   - {len(autores)} autores")
        print(f"   - {len(created_books)} libros (Catálogo: 3 páginas con limit=12)")
        print(f"   - {len(autorias)} autorías registradas")
        print(f"   - {len(clientes)} clientes con perfiles completos")
        print(f"   - {len(ventas_specs)} ventas registradas (Historial: 2 páginas con limit=15)")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
