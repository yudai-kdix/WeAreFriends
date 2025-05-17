from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timezone
from sqlalchemy.orm import relationship

Base = declarative_base()

class ExtendPrompt(Base):
    __tablename__ = "extend_prompt"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), index=True)
    prompt = Column(String(500))
    organization = relationship("Organization", back_populates="extend_prompts")
    created_at = created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))  # 修正

class Organization(Base):
    __tablename__ = "organization"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), index=True)
    extend_prompts = relationship("ExtendPrompt", back_populates="organization")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))  # 修正