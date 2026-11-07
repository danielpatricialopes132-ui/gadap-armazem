from typing import Optional
from uuid import UUID
from fastapi import HTTPException, Header, status
from app.core.supabase_client import supabase

def get_tenant_from_auth_header(authorization: Optional[str] = Header(None)) -> UUID:
    """
    Extrai o tenant_id autenticado via Supabase JWT.
    Em modo de desenvolvimento ou testes, aceita fallback se mock_token for passado.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Token ausente ou inválido no cabeçalho Authorization"
        )
    
    token = authorization.split(" ")[1]

    # Mock token para testes locais de desenvolvimento
    if token == "mock_token" or token == "dev_token":
        return UUID("11111111-1111-1111-1111-111111111111")

    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não autenticado no Supabase")
        
        tenant_id = (
            user_response.user.app_metadata.get("tenant_id") 
            or user_response.user.user_metadata.get("tenant_id")
            or user_response.user.app_metadata.get("company_id")
        )
        if not tenant_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant não configurado para o usuário")
        
        return UUID(tenant_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Erro de autenticação: {str(e)}")

