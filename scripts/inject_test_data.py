#!/usr/bin/env python3
"""Script interactivo/CLI para inyectar datos de prueba masivos (Libros, Clientes, Ventas).

Permite poblar la base de datos para probar la paginación de múltiples páginas,
filtros y visualización móvil tanto en local como en la VPS remota.

Uso:
    # Contra el backend local:
    python scripts/inject_test_data.py

    # Contra la VPS en producción:
    python scripts/inject_test_data.py --url https://localhost-libreria-frontend.oyerue.easypanel.host/api
"""

import argparse
import json
import random
import sys
import urllib.error
import urllib.request

LIBROS_MUESTRA = [
    ("978-950-12-9901-1", "Ficciones", 48.00, 20, 1, 1, 1),
    ("978-950-12-9902-2", "Inquisiciones", 35.00, 12, 1, 2, 1),
    ("978-950-12-9903-3", "Bestiario", 42.00, 25, 2, 1, 2),
    ("978-950-12-9904-4", "Final del juego", 39.00, 18, 2, 1, 2),
    ("978-950-12-9905-5", "De amor y de sombra", 36.00, 15, 2, 1, 3),
    ("978-950-12-9906-6", "Crónica de una muerte anunciada", 34.00, 30, 3, 1, 4),
    ("978-950-12-9907-7", "El amor en los tiempos del cólera", 46.00, 16, 3, 1, 4),
    ("978-950-12-9908-8", "Sobre héroes y tumbas", 44.00, 14, 1, 1, 1),
    ("978-950-12-9909-9", "El túnel", 32.00, 22, 1, 1, 1),
    ("978-950-12-9910-5", "Nuestra parte de noche", 58.00, 19, 2, 1, 2),
    ("978-950-12-9911-6", "Las cosas que perdimos en el fuego", 41.00, 15, 2, 1, 2),
    ("978-950-12-9912-7", "1984", 40.00, 28, 3, 3, 3),
    ("978-950-12-9913-8", "Rebelión en la granja", 29.00, 24, 3, 1, 3),
    ("978-950-12-9914-9", "Homenaje a Cataluña", 37.00, 10, 1, 2, 3),
    ("978-950-12-9915-0", "La metamorfosis", 25.00, 35, 1, 1, 4),
    ("978-950-12-9916-1", "El proceso", 33.00, 17, 1, 1, 4),
    ("978-950-12-9917-2", "La señora Dalloway", 38.00, 13, 2, 1, 2),
    ("978-950-12-9918-3", "Al faro", 36.50, 11, 2, 1, 2),
    ("978-950-12-9919-4", "Estudio en escarlata", 28.00, 21, 3, 1, 1),
    ("978-950-12-9920-0", "El sabueso de los Baskerville", 31.00, 18, 3, 1, 1),
    ("978-950-12-9921-1", "Antología Poética", 27.00, 16, 1, 1, 1),
    ("978-950-12-9922-2", "Todos los fuegos el fuego", 39.50, 14, 2, 1, 2),
]

CLIENTES_MUESTRA = [
    ("Carlos Rodríguez", f"carlos.{random.randint(100,999)}@test.com", "+54 9 11 2345-6789", "Av. Corrientes 2450, CABA"),
    ("Lucía Fernández", f"lucia.{random.randint(100,999)}@test.com", "+54 9 261 456-7890", "San Martín 820, Mendoza"),
    ("Juan Pérez", f"juan.{random.randint(100,999)}@test.com", "+54 9 351 567-8901", "Bv. Chacabuco 400, Córdoba"),
    ("Ana Martínez", f"ana.{random.randint(100,999)}@test.com", "+54 9 341 678-9012", "Pellegrini 1500, Rosario"),
    ("Diego Gómez", f"diego.{random.randint(100,999)}@test.com", "+54 9 11 7890-1234", "Callao 890, CABA"),
    ("Valentina Díaz", f"valentina.{random.randint(100,999)}@test.com", "+54 9 261 890-1234", "Belgrano 1120, Mendoza"),
    ("Matías López", f"matias.{random.randint(100,999)}@test.com", "+54 9 351 901-2345", "Colón 750, Córdoba"),
    ("Sofía Benítez", f"sofia.{random.randint(100,999)}@test.com", "+54 9 11 3456-7890", "Cabildo 3200, CABA"),
    ("Lucas Romero", f"lucas.{random.randint(100,999)}@test.com", "+54 9 341 456-7890", "Córdoba 1800, Rosario"),
    ("Camila Torres", f"camila.{random.randint(100,999)}@test.com", "+54 9 261 567-8901", "Arístides 450, Mendoza"),
]


def http_request(url, method="GET", data=None):
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        return {"error": e.code, "detail": err_msg}
    except Exception as e:
        return {"error": 500, "detail": str(e)}


def main():
    parser = argparse.ArgumentParser(description="Inyector de datos para paginación y pruebas.")
    parser.add_argument("--url", default="http://localhost:8000", help="URL base de la API (ej: http://localhost:8000 o https://.../api)")
    args = parser.parse_args()

    base_url = args.url.rstrip("/")
    print(f"[*] Conectando a la API en: {base_url}")

    # 1. Inyectar Clientes
    print("\n--- 1. Inyectando Clientes y Perfiles ---")
    created_client_ids = []
    for nombre, email, tel, dir_str in CLIENTES_MUESTRA:
        res = http_request(f"{base_url}/clientes/", method="POST", data={"nombre": nombre, "email": email})
        if "id" in res:
            cli_id = res["id"]
            created_client_ids.append(cli_id)
            print(f"  [+] Cliente #{cli_id}: {nombre} ({email})")
            # Inyectar Perfil
            http_request(f"{base_url}/clientes/{cli_id}/perfil", method="POST", data={"telefono": tel, "direccion": dir_str})
        else:
            # Si ya existía, intentar recuperar clientes existentes
            print(f"  [!] Cliente '{nombre}' omitido o ya existente.")

    # Si no se crearon nuevos porque ya existían, listar existentes
    if not created_client_ids:
        clis = http_request(f"{base_url}/clientes/?limit=50")
        if isinstance(clis, list):
            created_client_ids = [c["id"] for c in clis]

    # 2. Inyectar Libros
    print("\n--- 2. Inyectando Libros para Paginación de Catálogo ---")
    created_book_ids = []
    for isbn, titulo, precio, stock, ed_id, gen_id, aut_id in LIBROS_MUESTRA:
        payload = {
            "isbn": isbn,
            "titulo": titulo,
            "precio": precio,
            "stock": stock,
            "editorial_id": ed_id,
            "genero_id": gen_id,
            "autores": [{"autor_id": aut_id, "rol": "autor", "orden": 1}],
        }
        res = http_request(f"{base_url}/libros/", method="POST", data=payload)
        if "id" in res:
            b_id = res["id"]
            created_book_ids.append(b_id)
            print(f"  [+] Libro #{b_id}: '{titulo}' (${precio}) - Stock: {stock}")
        else:
            print(f"  [!] Libro '{titulo}' omitido ({res.get('detail', 'existente')})")

    # Listar libros existentes para ventas
    if not created_book_ids:
        bks = http_request(f"{base_url}/libros/?limit=50")
        if isinstance(bks, list):
            created_book_ids = [b["id"] for b in bks]

    # 3. Inyectar Ventas para Paginación de Historial (PAGE_LIMIT=15)
    print("\n--- 3. Inyectando Ventas para Paginación de Historial ---")
    if created_client_ids and created_book_ids:
        ventas_creadas = 0
        for i in range(18):
            cli = random.choice(created_client_ids)
            b1 = random.choice(created_book_ids)
            b2 = random.choice(created_book_ids)
            renglones = [{"libro_id": b1, "cantidad": 1}]
            if b1 != b2:
                renglones.append({"libro_id": b2, "cantidad": 1})

            v_res = http_request(f"{base_url}/ventas/", method="POST", data={"cliente_id": cli, "renglones": renglones})
            if "id" in v_res:
                ventas_creadas += 1
                print(f"  [+] Venta #{v_res['id']} registrada (Cliente #{cli}, Total: ${v_res['total']})")
        print(f"\n[OK] Se registraron {ventas_creadas} ventas adicionales.")
    else:
        print("[!] No hay suficientes clientes o libros para generar ventas.")

    print("\n[ÉXITO] Inyección completada.")
    print("Ya puedes verificar la paginación múltiple (Página 1, Página 2, Página 3) y el estado bloqueado de botones.")


if __name__ == "__main__":
    main()
