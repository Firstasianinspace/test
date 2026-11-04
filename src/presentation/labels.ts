import type { TaskStatus } from '@/domain/task/TaskStatus';

export const STATUS_LABEL: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  on_review: 'На проверке',
  accepted: 'Принята',
  needs_rework: 'На доработке',
};

export const ACTION_LABEL: Record<TaskStatus, string> = {
  new: 'Создать',
  in_progress: 'Взять в работу',
  on_review: 'Отправить на проверку',
  accepted: 'Принять',
  needs_rework: 'Вернуть на доработку',
};

export const ERROR_LABEL: Record<string, string> = {
  forbidden: 'Недостаточно прав для этого действия',
  not_found: 'Не найдено',
  invalid_transition: 'Такой переход статуса запрещён',
  comment_required: 'Для возврата на доработку нужен комментарий',
  assignee_required: 'Сначала назначьте исполнителя',
  invalid_assignee: 'Исполнителем может быть только пользователь с ролью «исполнитель»',
  validation: 'Проверьте введённые данные',
  has_dependents: 'Нельзя удалить: есть связанные задачи',
  unauthenticated: 'Неверный email или пароль',
  unknown: 'Что-то пошло не так',
};
