import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

import app.main
from app.modules.editoriales.models import Editorial
from app.modules.generos.models import Genero
from app.modules.libros.models import Libro
from app.modules.libros.schemas import LibroCreate, LibroUpdate
from app.modules.libros.service import update_libro


@pytest.mark.asyncio
async def test_update_libro_stock_actualiza_correctamente():
    # Arrange
    editorial = Editorial(id=1, nombre="Editorial Planeta", pais="Argentina")
    genero = Genero(id=1, nombre="Ficción")
    libro = Libro(
        id=1,
        titulo="Rayuela",
        isbn="978-950-12-3456-8",
        precio=Decimal("50.00"),
        stock=10,
        editorial_id=1,
        genero_id=1,
        editorial=editorial,
        genero=genero,
        autorias=[],
    )

    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_res = MagicMock()
    mock_res.unique.return_value.scalar_one_or_none.return_value = libro
    mock_res.unique.return_value.scalar_one.return_value = libro
    mock_session.execute.return_value = mock_res

    payload = LibroUpdate(stock=25)

    # Act
    resultado = await update_libro(mock_session, 1, payload)

    # Assert
    assert libro.stock == 25
    mock_session.add.assert_called_with(libro)
    mock_session.commit.assert_awaited_once()
    assert resultado.stock == 25


@pytest.mark.asyncio
async def test_update_libro_inexistente_lanza_404():
    # Arrange
    mock_session = AsyncMock()
    mock_res = MagicMock()
    mock_res.unique.return_value.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res

    payload = LibroUpdate(stock=15)

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await update_libro(mock_session, 999, payload)

    assert exc_info.value.status_code == 404


def test_libro_update_isbn_vacio_lanza_error_validacion():
    with pytest.raises(ValidationError) as exc_info:
        LibroUpdate(isbn="   ")

    assert "El ISBN no puede estar vacío" in str(exc_info.value)


def test_libro_create_isbn_vacio_lanza_error_validacion():
    with pytest.raises(ValidationError) as exc_info:
        LibroCreate(
            isbn="   ",
            titulo="El Aleph",
            precio=Decimal("50.00"),
            stock=5,
            editorial_id=1,
        )

    assert "El ISBN no puede estar vacío" in str(exc_info.value)


@pytest.mark.asyncio
async def test_update_libro_isbn_titulo_stock_precio_actualiza_correctamente():
    # Arrange
    editorial = Editorial(id=1, nombre="Editorial Planeta", pais="Argentina")
    genero = Genero(id=1, nombre="Ficción")
    libro = Libro(
        id=1,
        titulo="Rayuela",
        isbn="978-950-12-3456-8",
        precio=Decimal("50.00"),
        stock=10,
        editorial_id=1,
        genero_id=1,
        editorial=editorial,
        genero=genero,
        autorias=[],
    )

    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_res = MagicMock()
    mock_res.unique.return_value.scalar_one_or_none.return_value = libro
    mock_res.unique.return_value.scalar_one.return_value = libro
    mock_session.execute.return_value = mock_res

    payload = LibroUpdate(
        isbn="  978-950-04-2455-4  ",
        titulo="El Aleph",
        stock=20,
        precio=Decimal("95.50"),
    )

    # Act
    resultado = await update_libro(mock_session, 1, payload)

    # Assert
    assert libro.isbn == "978-950-04-2455-4"
    assert libro.titulo == "El Aleph"
    assert libro.stock == 20
    assert libro.precio == Decimal("95.50")
    assert resultado.isbn == "978-950-04-2455-4"
    assert resultado.titulo == "El Aleph"
    assert resultado.stock == 20
    assert resultado.precio == Decimal("95.50")


@pytest.mark.asyncio
async def test_update_libro_isbn_duplicado_lanza_409():
    # Arrange
    editorial = Editorial(id=1, nombre="Editorial Planeta", pais="Argentina")
    genero = Genero(id=1, nombre="Ficción")
    libro = Libro(
        id=1,
        titulo="Rayuela",
        isbn="978-950-12-3456-8",
        precio=Decimal("50.00"),
        stock=10,
        editorial_id=1,
        genero_id=1,
        editorial=editorial,
        genero=genero,
        autorias=[],
    )

    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_res = MagicMock()
    mock_res.unique.return_value.scalar_one_or_none.return_value = libro
    mock_session.execute.return_value = mock_res

    orig_exc = Exception('duplicate key value violates unique constraint "libro_isbn_key"')
    mock_session.commit.side_effect = IntegrityError("UPDATE libro", {}, orig_exc)

    payload = LibroUpdate(isbn="978-950-04-2455-4")

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await update_libro(mock_session, 1, payload)

    mock_session.rollback.assert_awaited_once()
    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == "Ya existe un libro con ese ISBN"
