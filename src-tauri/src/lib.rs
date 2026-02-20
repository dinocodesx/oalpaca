mod api;

use api::models::copy_model::copy_model;
use api::models::create_model::create_model;
use api::models::delete_model::delete_model;
use api::models::list_models::list_models;
use api::models::list_of_running_models::list_of_running_models;
use api::models::pull_model::pull_model;
use api::models::push_model::push_model;
use api::models::show_model_details::show_model_details;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_models,
            list_of_running_models,
            show_model_details,
            create_model,
            copy_model,
            pull_model,
            push_model,
            delete_model
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
