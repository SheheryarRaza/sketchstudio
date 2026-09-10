import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from app.core.database import get_db
from app.models.project import ProjectModel

router = APIRouter(prefix="/projects", tags=["Projects"])

class ProjectCreate(BaseModel):
    title: str = "Untitled Portrait"
    image_filename: Optional[str] = None
    image_width: int = 600
    image_height: int = 800
    medium: str = "graphite"
    stage: int = 1
    is_sandbox: bool = False
    num_value_layers: int = 5
    layers_data: Optional[dict] = None
    grid_data: Optional[dict] = None
    calibration_data: Optional[dict] = None
    methods_data: Optional[dict] = None
    notes: Optional[str] = None

class ProjectResponse(ProjectCreate):
    id: str

@router.get("/", response_model=List[ProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProjectModel).order_by(ProjectModel.updated_at.desc()))
    projects = result.scalars().all()
    return [
        ProjectResponse(
            id=p.id,
            title=p.title,
            image_filename=p.image_filename,
            image_width=p.image_width,
            image_height=p.image_height,
            medium=p.medium,
            stage=p.stage,
            is_sandbox=p.is_sandbox,
            num_value_layers=p.num_value_layers,
            layers_data=p.layers_data,
            grid_data=p.grid_data,
            calibration_data=p.calibration_data,
            methods_data=p.methods_data,
            notes=p.notes,
        )
        for p in projects
    ]

@router.post("/", response_model=ProjectResponse)
async def create_or_save_project(payload: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project_id = str(uuid.uuid4())
    db_project = ProjectModel(
        id=project_id,
        title=payload.title,
        image_filename=payload.image_filename,
        image_width=payload.image_width,
        image_height=payload.image_height,
        medium=payload.medium,
        stage=payload.stage,
        is_sandbox=payload.is_sandbox,
        num_value_layers=payload.num_value_layers,
        layers_data=payload.layers_data,
        grid_data=payload.grid_data,
        calibration_data=payload.calibration_data,
        methods_data=payload.methods_data,
        notes=payload.notes,
    )
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return ProjectResponse(
        id=db_project.id,
        title=db_project.title,
        image_filename=db_project.image_filename,
        image_width=db_project.image_width,
        image_height=db_project.image_height,
        medium=db_project.medium,
        stage=db_project.stage,
        is_sandbox=db_project.is_sandbox,
        num_value_layers=db_project.num_value_layers,
        layers_data=db_project.layers_data,
        grid_data=db_project.grid_data,
        calibration_data=db_project.calibration_data,
        methods_data=db_project.methods_data,
        notes=db_project.notes,
    )
