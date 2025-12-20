from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from .database import get_db
from .models import user as user_model
from .schemas import user as user_schema
from .auth_utils import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            print("Debug: No sub in payload")
            raise credentials_exception
        token_data = user_schema.TokenData(email=email)
    except JWTError as e:
        print(f"Debug: JWT Error: {e}")
        raise credentials_exception
    user = db.query(user_model.User).filter(user_model.User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user
