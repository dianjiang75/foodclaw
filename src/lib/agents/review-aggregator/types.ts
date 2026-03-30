export interface RawReview {
  text: string;
  rating: number;
  author: string;
  date: string;
  source: "google" | "yelp";
}

export interface DishReviewSummary {
  summary: string;
  dish_rating: number;
  common_praises: string[];
  common_complaints: string[];
  dietary_warnings: string[];
  portion_perception: "generous" | "average" | "small" | "unknown";
}

export interface ReviewAggregationResult {
  restaurantId: string;
  dishSummaries: {
    dishId: string;
    dishName: string;
    reviewCount: number;
    summary: DishReviewSummary;
  }[];
  totalReviewsFetched: number;
  googleReviewCount: number;
  yelpReviewCount: number;
}
