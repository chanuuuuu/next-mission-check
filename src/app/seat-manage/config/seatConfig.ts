// Dynamic seat layout configuration.
// first = 1F, second = 2F.
// Each floor is an array of 분단(blocks), each 분단 is an array of row seat counts (front-to-back).
// Blocks are labeled A, B, C, D in order (index 0 = A).
export const SEAT_CONFIG = {
  first: [
    [12, 12, 12, 12, 12, 12, 12, 7],                                              // A분단
    [10, 10, 10, 10, 10, 10, 10, 10, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12],    // B분단
    [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12], // C분단
    [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 7],             // D분단
  ],
  second: [
    [8, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],    // A분단
    [10, 10, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12],  // B분단
    [10, 10, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12],  // C분단
    [8, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],    // D분단
  ],
} as const
