export declare enum MealType {
    LUNCH = "LUNCH",
    DINNER = "DINNER"
}
export declare enum RequestCategory {
    OFF = "OFF",
    GUEST = "GUEST"
}
export declare class UpdateMealDto {
    type: MealType;
    category: RequestCategory;
    count: number;
}
