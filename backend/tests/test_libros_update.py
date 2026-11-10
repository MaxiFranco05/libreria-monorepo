import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException

import app.main
from app.modules.editoriales.models import Editorial
from app.modules.generos.models import Genero
from app.modules.libros.models import Libro
from app.modules.libros.schemas import LibroUpdate
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
