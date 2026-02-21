mod api;

use api::chats::chat_storage::delete_chat;
use api::chats::chat_storage::get_all_chats;
use api::chats::chat_storage::get_chat_messages;
use api::chats::chat_storage::get_chats_for_workspace;
use api::chats::chat_storage::rename_chat;
use api::chats::chat_storage::search_chats;
use api::chats::generate_chat_message::send_chat_message;
use api::folders::folders_storage::add_chat_to_folder;
use api::folders::folders_storage::create_folder;
use api::folders::folders_storage::delete_folder;
use api::folders::folders_storage::get_folders_for_workspace;
use api::folders::folders_storage::remove_chat_from_folder_cmd;
use api::folders::folders_storage::rename_folder;
use api::models::copy_model::copy_model;
use api::models::create_model::create_model;
use api::models::delete_model::delete_model;
use api::models::list_models::list_models;
use api::models::list_running_models::list_running_models;
use api::models::pull_model::pull_model;
use api::models::push_model::push_model;
use api::models::show_model_details::show_model_details;
use api::workspace::workspace_storage::create_workspace;
use api::workspace::workspace_storage::delete_workspace;
use api::workspace::workspace_storage::get_all_workspaces;
use api::workspace::workspace_storage::rename_workspace;
use api::workspace::workspace_storage::set_active_workspace;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // Models
            list_models,
            list_running_models,
            show_model_details,
            create_model,
            copy_model,
            pull_model,
            push_model,
            delete_model,
            // Chat
            send_chat_message,
            get_all_chats,
            get_chats_for_workspace,
            get_chat_messages,
            rename_chat,
            delete_chat,
            search_chats,
            // Workspaces
            get_all_workspaces,
            create_workspace,
            rename_workspace,
            delete_workspace,
            set_active_workspace,
            // Folders
            get_folders_for_workspace,
            create_folder,
            rename_folder,
            delete_folder,
            add_chat_to_folder,
            remove_chat_from_folder_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
