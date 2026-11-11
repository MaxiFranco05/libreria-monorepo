import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException
from app.core.exceptions import DomainError

# Import all models to resolve SQLAlchemy forward relationships
import app.main
from app.modules.clientes.models import Cliente
from app.modules.libros.models import Libro
from app.modules.ventas.models import Venta
from app.modules.ventas.schemas import RenglonVentaCreate, VentaCreate
from app.modules.ventas.service import crear_venta


@pytest.mark.asyncio
async def test_crear_venta_stock_insuficiente_lanza_409():
    libro = Libro(
        id=1,
        titulo="Rayuela",
        isbn="978-950-12-3456-8",
        precio=Decimal("50.00"),
        stock=2,
        editorial_id=1,
    )

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [libro]
    mock_session.execute.return_value = mock_result

    data = VentaCreate(
        cliente_id=1,
        renglones=[RenglonVentaCreate(libro_id=1, cantidad=5)]  # Pide 5, stock es 2
    )
    background_tasks = MagicMock()

    with pytest.raises((HTTPException, DomainError)) as exc_info:
        await crear_venta(mock_session, data, background_tasks)

    assert exc_info.value.status_code == 409
    assert "Stock insuficiente" in exc_info.value.detail
    assert "disponible: 2" in exc_info.value.detail


@pytest.mark.asyncio
async def test_crear_venta_descuenta_stock_correctamente():
    libro = Libro(
        id=1,
        titulo="Ficciones",
        isbn="978-950-12-3456-7",
        precio=Decimal("45.00"),
        stock=10,
        editorial_id=1,
    )

    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [libro]

    mock_cliente = Cliente(id=1, nombre="Juan Pérez", email="juan@example.com")
    mock_venta = Venta(
        id=1,
        cliente_id=1,
        total=Decimal("135.00"),
        cliente=mock_cliente,
        renglones=[]
    )
    mock_reload_res = MagicMock()
    mock_reload_res.unique.return_value.scalar_one.return_value = mock_venta
    mock_session.execute.side_effect = [mock_result, mock_reload_res]

    data = VentaCreate(
        cliente_id=1,
        renglones=[RenglonVentaCreate(libro_id=1, cantidad=3)]  # Pide 3 de 10
    )
    background_tasks = MagicMock()

    venta_res = await crear_venta(mock_session, data, background_tasks)

    assert libro.stock == 7  # 10 - 3 = 7
    mock_session.add.assert_any_call(libro)
    mock_session.commit.assert_awaited_once()
    assert venta_res.total == Decimal("135.00")


@pytest.mark.asyncio
async def test_crear_venta_stock_exacto_deja_cero():
    libro = Libro(
        id=2,
        titulo="El Aleph",
        isbn="978-950-12-3456-9",
        precio=Decimal("60.00"),
        stock=4,
        editorial_id=1,
    )

    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [libro]

    mock_cliente = Cliente(id=1, nombre="María González", email="maria@example.com")
    mock_venta = Venta(
        id=2,
        cliente_id=1,
        total=Decimal("240.00"),
        cliente=mock_cliente,
        renglones=[]
    )
    mock_reload_res = MagicMock()
    mock_reload_res.unique.return_value.scalar_one.return_value = mock_venta
    mock_session.execute.side_effect = [mock_result, mock_reload_res]

    data = VentaCreate(
        cliente_id=1,
        renglones=[RenglonVentaCreate(libro_id=2, cantidad=4)]  # Pide los 4 exactos
    )
    background_tasks = MagicMock()

    venta_res = await crear_venta(mock_session, data, background_tasks)

    assert libro.stock == 0  # 4 - 4 = 0
    mock_session.add.assert_any_call(libro)
    mock_session.commit.assert_awaited_once()
    assert venta_res.total == Decimal("240.00")
