// =========================================================================
// 📦 Typed Event Payload Classes for Event-Driven Cache Invalidation
// =========================================================================

export class MessUpdatedEvent {
  messId!: string;
  monthId?: string | null;
  affectedUserEmails?: string[];
}

export class MemberJoinedEvent {
  messId!: string;
  memberEmail!: string;
  managerEmail?: string;
}

export class MemberLeftEvent {
  messId!: string;
  memberEmail!: string;
  monthId?: string | null;
}

export class ManagerTransferredEvent {
  messId!: string;
  oldManagerEmail!: string;
  newManagerEmail!: string;
}

export class BazaarUpdatedEvent {
  messId!: string;
  monthId!: string;
}

export class BillingUpdatedEvent {
  messId!: string;
  monthId!: string;
}

export class MealUpdatedEvent {
  messId!: string;
  dateStr!: string;
}

export class UserProfileUpdatedEvent {
  email!: string;
}
