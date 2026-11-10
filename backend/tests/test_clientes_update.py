import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

import app.main
from app.modules.clientes.models import Cliente
from app.modules.clientes.schemas import ClienteUpdate
from app.modules.clientes.service import actualizar_cliente


@pytest.mark.asyncio
async def test_actualizar_cliente_nombre_y_email_exitoso():
    # Arrange
    cliente = Cliente(
        id=1,
        nombre="Juan Pérez",
        email="juan.perez@correo.com",
        perfil=None,
    )

    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_res = MagicMock()
    mock_res.unique.return_value.scalar_one_or_none.return_value = cliente
    mock_res.unique.return_value.scalar_one.return_value = cliente
    mock_session.execute.return_value = mock_res

    payload = ClienteUpdate(
        nombre="  María González  ",
        email="maria.gonzalez@correo.com",
    )

    # Act
    resultado = await actualizar_cliente(mock_session, 1, payload)

    # Assert
    assert cliente.nombre == "María González"
    assert cliente.email == "maria.gonzalez@correo.com"
    mock_session.add.assert_called_with(cliente)
    mock_session.commit.assert_awaited_once()
    assert resultado.id == 1
    assert resultado.nombre == "María González"
    assert resultado.email == "maria.gonzalez@correo.com"


@pytest.mark.asyncio
async def test_actualizar_cliente_inexistente_lanza_404():
    # Arrange
    mock_session = AsyncMock()
    mock_res = MagicMock()
    mock_res.unique.return_value.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res

    payload = ClienteUpdate(nombre="Nuevo Nombre")

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await actualizar_cliente(mock_session, 999, payload)

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Cliente no encontrado"


@pytest.mark.asyncio
async def test_actualizar_cliente_email_duplicado_lanza_409():
    # Arrange
    cliente = Cliente(
        id=1,
        nombre="Juan Pérez",
        email="juan.perez@correo.com",
        perfil=None,
    )

    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_res = MagicMock()
    mock_res.unique.return_value.scalar_one_or_none.return_value = cliente
    mock_session.execute.return_value = mock_res

    orig_exc = Exception('duplicate key value violates unique constraint "cliente_email_key"')
    mock_session.commit.side_effect = IntegrityError("UPDATE cliente", {}, orig_exc)

    payload = ClienteUpdate(email="existente@correo.com")

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await actualizar_cliente(mock_session, 1, payload)

    mock_session.rollback.assert_awaited_once()
    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == "Email ya registrado"


def test_cliente_update_nombre_vacio_lanza_validation_error():
    with pytest.raises(ValidationError) as exc_info:
        ClienteUpdate(nombre="   ")

    assert "El nombre del cliente no puede estar vacío" in str(exc_info.value)


def test_cliente_update_email_invalido_lanza_validation_error():
    with pytest.raises(ValidationError):
        ClienteUpdate(email="correo-invalido-sin-arroba")
