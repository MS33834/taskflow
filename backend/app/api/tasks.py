"""任务、项目、分类、标签 API"""
import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.task import Category, Project, Tag, Task
from app.schemas.task import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    TagCreate,
    TagResponse,
    TagUpdate,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)
from app.utils.logger import logger

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _dump(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str) if value is not None else "[]"


def _load(value: str | None, default: Any = None) -> Any:
    if value is None:
        return default if default is not None else []
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default if default is not None else []


def _task_to_response(task: Task) -> dict:
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "content": task.content,
        "due_date": task.due_date,
        "start_date": task.start_date,
        "reminder_date": task.reminder_date,
        "priority": task.priority,
        "status": task.status,
        "progress": task.progress,
        "category_id": task.category_id,
        "project_id": task.project_id,
        "completed": task.completed,
        "completed_at": task.completed_at,
        "estimated_time": task.estimated_time,
        "actual_time": task.actual_time,
        "is_recurring": task.is_recurring,
        "parent_task_id": task.parent_task_id,
        "is_starred": task.is_starred,
        "is_hidden": task.is_hidden,
        "is_archived": task.is_archived,
        "is_deleted": task.is_deleted,
        "deleted_at": task.deleted_at,
        "assignee_id": task.assignee_id,
        "created_by": task.created_by,
        "order": task.order,
        "version": task.version,
        "tags": _load(task.tags),
        "subtasks": _load(task.subtasks),
        "attachments": _load(task.attachments),
        "comments": _load(task.comments),
        "links": _load(task.links),
        "custom_fields": _load(task.custom_fields),
        "dependencies": _load(task.dependencies),
        "blocked_by": _load(task.blocked_by),
        "notes": _load(task.notes),
        "checklist": _load(task.checklist),
        "created_at": task.created_at,
        "updated_at": task.updated_at,
    }


@router.get("/", response_model=list[TaskResponse])
async def list_tasks(
    include_deleted: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """获取任务列表"""
    stmt = select(Task)
    if not include_deleted:
        stmt = stmt.where(Task.is_deleted == False)
    result = await db.execute(stmt.order_by(Task.order, Task.created_at.desc()))
    return [_task_to_response(t) for t in result.scalars().all()]


@router.post("/", response_model=TaskResponse, status_code=201)
async def create_task(task_in: TaskCreate, db: AsyncSession = Depends(get_db)):
    """创建任务"""
    now = _now()
    task = Task(
        id=task_in.id if task_in.id else f"task_{int(now.timestamp() * 1000)}",
        title=task_in.title,
        description=task_in.description,
        content=task_in.content,
        due_date=task_in.due_date,
        start_date=task_in.start_date,
        reminder_date=task_in.reminder_date,
        priority=task_in.priority,
        status=task_in.status,
        progress=task_in.progress,
        category_id=task_in.category_id,
        project_id=task_in.project_id,
        completed=task_in.completed,
        completed_at=task_in.completed_at,
        estimated_time=task_in.estimated_time,
        actual_time=task_in.actual_time,
        is_recurring=task_in.is_recurring,
        parent_task_id=task_in.parent_task_id,
        is_starred=task_in.is_starred,
        is_hidden=task_in.is_hidden,
        is_archived=task_in.is_archived,
        is_deleted=task_in.is_deleted,
        deleted_at=task_in.deleted_at,
        assignee_id=task_in.assignee_id,
        created_by=task_in.created_by,
        order=task_in.order,
        version=task_in.version,
        tags=_dump(task_in.tags),
        subtasks=_dump([s.model_dump() for s in task_in.subtasks]),
        attachments=_dump(task_in.attachments),
        comments=_dump(task_in.comments),
        links=_dump(task_in.links),
        custom_fields=_dump(task_in.custom_fields),
        dependencies=_dump(task_in.dependencies),
        blocked_by=_dump(task_in.blocked_by),
        notes=_dump(task_in.notes),
        checklist=_dump([c.model_dump() for c in task_in.checklist]),
        created_at=now,
        updated_at=now,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    logger.info(f"Task created: {task.id}")
    return _task_to_response(task)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, db: AsyncSession = Depends(get_db)):
    """获取单个任务"""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task_to_response(task)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, updates: TaskUpdate, db: AsyncSession = Depends(get_db)):
    """更新任务"""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    data = updates.model_dump(exclude_unset=True)
    now = _now()
    task.updated_at = now
    task.version = task.version + 1

    json_fields = {
        "tags": "tags",
        "subtasks": "subtasks",
        "attachments": "attachments",
        "comments": "comments",
        "links": "links",
        "custom_fields": "custom_fields",
        "dependencies": "dependencies",
        "blocked_by": "blocked_by",
        "notes": "notes",
        "checklist": "checklist",
    }

    for key, value in data.items():
        if key == "id":
            continue
        if key in json_fields:
            if isinstance(value, list) and value and hasattr(value[0], "model_dump"):
                value = [v.model_dump() for v in value]
            setattr(task, json_fields[key], _dump(value))
        else:
            setattr(task, key, value)

    await db.commit()
    await db.refresh(task)
    logger.info(f"Task updated: {task.id}")
    return _task_to_response(task)


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: str, hard: bool = Query(False), db: AsyncSession = Depends(get_db)):
    """删除任务（默认软删除）"""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if hard:
        await db.delete(task)
    else:
        task.is_deleted = True
        task.deleted_at = _now()
        task.updated_at = _now()

    await db.commit()
    logger.info(f"Task deleted: {task_id}")
    return None


def _project_to_response(project: Project) -> dict:
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "color": project.color,
        "icon": project.icon,
        "status": project.status,
        "is_default": project.is_default,
        "is_favorite": project.is_favorite,
        "is_archived": project.is_archived,
        "parent_project_id": project.parent_project_id,
        "owner_id": project.owner_id,
        "task_count": project.task_count,
        "completed_task_count": project.completed_task_count,
        "progress": project.progress,
        "start_date": project.start_date,
        "due_date": project.due_date,
        "tags": _load(project.tags),
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }


# Projects


@router.get("/projects/", response_model=list[ProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db)):
    """获取项目列表"""
    result = await db.execute(select(Project).order_by(Project.created_at.desc()))
    return [_project_to_response(p) for p in result.scalars().all()]


@router.post("/projects/", response_model=ProjectResponse, status_code=201)
async def create_project(project_in: ProjectCreate, db: AsyncSession = Depends(get_db)):
    """创建项目"""
    now = _now()
    project = Project(
        id=project_in.id if project_in.id else f"project_{int(now.timestamp() * 1000)}",
        **project_in.model_dump(exclude={"id", "created_at", "updated_at", "tags"}),
        tags=_dump(project_in.tags),
        created_at=now,
        updated_at=now,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return _project_to_response(project)


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return _project_to_response(project)


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, updates: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for key, value in updates.model_dump(exclude_unset=True).items():
        if key == "tags":
            project.tags = _dump(value)
        elif key not in ("id", "created_at", "updated_at"):
            setattr(project, key, value)

    project.updated_at = _now()
    await db.commit()
    await db.refresh(project)
    return _project_to_response(project)


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)
    await db.commit()
    return None


# Categories


@router.get("/categories/", response_model=list[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).order_by(Category.order, Category.created_at.desc()))
    return result.scalars().all()


@router.post("/categories/", response_model=CategoryResponse, status_code=201)
async def create_category(category_in: CategoryCreate, db: AsyncSession = Depends(get_db)):
    now = _now()
    category = Category(
        id=category_in.id if category_in.id else f"category_{int(now.timestamp() * 1000)}",
        **category_in.model_dump(exclude={"id", "created_at", "updated_at"}),
        created_at=now,
        updated_at=now,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.get("/categories/{category_id}", response_model=CategoryResponse)
async def get_category(category_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.patch("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: str, updates: CategoryUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    for key, value in updates.model_dump(exclude_unset=True).items():
        if key not in ("id", "created_at", "updated_at"):
            setattr(category, key, value)

    category.updated_at = _now()
    await db.commit()
    await db.refresh(category)
    return category


@router.delete("/categories/{category_id}", status_code=204)
async def delete_category(category_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.delete(category)
    await db.commit()
    return None


# Tags


@router.get("/tags/", response_model=list[TagResponse])
async def list_tags(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tag).order_by(Tag.created_at.desc()))
    return result.scalars().all()


@router.post("/tags/", response_model=TagResponse, status_code=201)
async def create_tag(tag_in: TagCreate, db: AsyncSession = Depends(get_db)):
    now = _now()
    tag = Tag(
        id=tag_in.id if tag_in.id else f"tag_{int(now.timestamp() * 1000)}",
        **tag_in.model_dump(exclude={"id", "created_at", "updated_at"}),
        created_at=now,
        updated_at=now,
    )
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return tag


@router.get("/tags/{tag_id}", response_model=TagResponse)
async def get_tag(tag_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@router.patch("/tags/{tag_id}", response_model=TagResponse)
async def update_tag(tag_id: str, updates: TagUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    for key, value in updates.model_dump(exclude_unset=True).items():
        if key not in ("id", "created_at", "updated_at"):
            setattr(tag, key, value)

    tag.updated_at = _now()
    await db.commit()
    await db.refresh(tag)
    return tag


@router.delete("/tags/{tag_id}", status_code=204)
async def delete_tag(tag_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    await db.delete(tag)
    await db.commit()
    return None
