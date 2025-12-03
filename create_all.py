from app.database import Base, engine
import app.models as models
Base.metadata.create_all(bind=engine)
print("OK create_all")
