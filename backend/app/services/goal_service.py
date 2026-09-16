from decimal import Decimal
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import EntityNotFoundException
from app.db.models.goal import FinancialGoal, GoalStatus
from app.repositories.goal_repo import GoalRepository
from app.schemas.goal import GoalCreate, GoalResponse, GoalUpdate


class GoalService:
    def __init__(self, session: AsyncSession):
        self.goal_repo = GoalRepository(session)

    def _calculate_progress(self, goal: FinancialGoal) -> GoalResponse:
        target = Decimal(str(goal.target_amount))
        current = Decimal(str(goal.current_amount))
        progress = float(min(Decimal("100.0"), (current / target * Decimal("100.0")))) if target > 0 else 0.0
        resp = GoalResponse.model_validate(goal)
        resp.progress_percentage = round(progress, 1)
        return resp

    async def get_goals(self, user_id: str) -> List[GoalResponse]:
        goals = await self.goal_repo.get_by_user(user_id)
        return [self._calculate_progress(g) for g in goals]

    async def get_by_id(self, id: str, user_id: str) -> GoalResponse:
        goal = await self.goal_repo.get_by_id_and_user(id, user_id)
        if not goal:
            raise EntityNotFoundException("Financial Goal", id)
        return self._calculate_progress(goal)

    async def create_goal(self, user_id: str, goal_in: GoalCreate) -> GoalResponse:
        goal_dict = goal_in.model_dump()
        goal_dict["user_id"] = user_id
        goal = await self.goal_repo.create(goal_dict)
        return self._calculate_progress(goal)


    async def update_goal(self, id: str, user_id: str, goal_in: GoalUpdate) -> GoalResponse:
        goal = await self.goal_repo.get_by_id_and_user(id, user_id)
        if not goal:
            raise EntityNotFoundException("Financial Goal", id)
        update_data = goal_in.model_dump(exclude_unset=True)
        if "current_amount" in update_data and "target_amount" in update_data:
            if Decimal(str(update_data["current_amount"])) >= Decimal(str(update_data["target_amount"])):
                update_data["status"] = GoalStatus.ACHIEVED
        elif "current_amount" in update_data:
            if Decimal(str(update_data["current_amount"])) >= Decimal(str(goal.target_amount)):
                update_data["status"] = GoalStatus.ACHIEVED
        updated = await self.goal_repo.update(goal, update_data)
        return self._calculate_progress(updated)


    async def delete_goal(self, id: str, user_id: str) -> bool:
        goal = await self.goal_repo.get_by_id_and_user(id, user_id)
        if not goal:
            raise EntityNotFoundException("Financial Goal", id)
        return await self.goal_repo.delete(goal)
