use axum::{routing::{post, get}, Json, Router};
use rand::SeedableRng;
use rand_distr::{Distribution, Normal};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct MonteCarloRequest {
    starting_value: f64,
    expected_annual_return: f64,
    annualized_volatility: f64,
    years: u32,
    #[serde(default = "default_simulations")]
    simulations: usize,
}

fn default_simulations() -> usize { 5000 }

#[derive(Serialize)]
struct TrajectoryPoint {
    month: usize,
    median: f64,
    bull: f64,
    bear: f64,
}

#[derive(Serialize)]
struct MonteCarloResponse {
    starting_value: f64,
    median_final_value: f64,
    bull_final_value: f64,
    bear_final_value: f64,
    trajectory: Vec<TrajectoryPoint>,
}

fn simulate_one_path(req: &MonteCarloRequest, seed: u64, steps: usize) -> Vec<f64> {
    let dt = 1.0 / 12.0;
    let drift = (req.expected_annual_return - 0.5 * req.annualized_volatility.powi(2)) * dt;
    let shock = req.annualized_volatility * dt.sqrt();

    let mut rng = rand::rngs::StdRng::seed_from_u64(seed);
    let normal = Normal::new(0.0, 1.0).unwrap();

    let mut path = Vec::with_capacity(steps + 1);
    let mut value = req.starting_value;
    path.push(value);
    for _ in 0..steps {
        let z: f64 = normal.sample(&mut rng);
        value *= (drift + shock * z).exp();
        path.push(value);
    }
    path
}

fn percentile(sorted: &[f64], p: f64) -> f64 {
    let idx = ((sorted.len() as f64 - 1.0) * p).round() as usize;
    sorted[idx]
}

async fn run_monte_carlo(Json(req): Json<MonteCarloRequest>) -> Json<MonteCarloResponse> {
    let steps = (req.years * 12) as usize;

    let all_paths: Vec<Vec<f64>> = (0..req.simulations)
        .into_par_iter()
        .map(|i| simulate_one_path(&req, i as u64, steps))
        .collect();

    let mut trajectory = Vec::new();
    for month in (0..=steps).step_by(3) {
        let mut values_at_month: Vec<f64> = all_paths.iter().map(|p| p[month]).collect();
        values_at_month.sort_by(|a, b| a.partial_cmp(b).unwrap());
        trajectory.push(TrajectoryPoint {
            month,
            median: percentile(&values_at_month, 0.50),
            bull: percentile(&values_at_month, 0.90),
            bear: percentile(&values_at_month, 0.10),
        });
    }

    let mut finals: Vec<f64> = all_paths.iter().map(|p| *p.last().unwrap()).collect();
    finals.sort_by(|a, b| a.partial_cmp(b).unwrap());

    Json(MonteCarloResponse {
        starting_value: req.starting_value,
        median_final_value: percentile(&finals, 0.50),
        bull_final_value: percentile(&finals, 0.90),
        bear_final_value: percentile(&finals, 0.10),
        trajectory,
    })
}

async fn health() -> &'static str { "OK" }

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/simulate", post(run_monte_carlo))
        .route("/health", get(health));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:9000").await.unwrap();
    println!("wealthos-montecarlo listening on :9000");
    axum::serve(listener, app).await.unwrap();
}
