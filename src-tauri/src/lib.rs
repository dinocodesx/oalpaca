mod api;

use api::models::list_models::list_models;
use api::models::list_of_running_models::list_of_running_models;
use api::models::show_model_details::show_model_details;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_models,
            list_of_running_models,
            show_model_details
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
