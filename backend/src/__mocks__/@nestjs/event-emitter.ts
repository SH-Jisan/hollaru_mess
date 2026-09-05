export class EventEmitter2 {
  emit(...args: any[]) {
    return true;
  }
  on(...args: any[]) {
    return this;
  }
}

export class EventEmitterModule {
  static forRoot(...args: any[]) {
    return {
      module: EventEmitterModule,
      providers: [EventEmitter2],
      exports: [EventEmitter2],
    };
  }
}
