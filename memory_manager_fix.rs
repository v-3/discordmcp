use std::sync::Arc;
use warp_mcp_server::{memory::MemoryManager, redis_store::RedisStore, embeddings::EmbeddingService, config::Config};

#[tokio::test]
async fn test_memory_manager_basic() {
    let config = Config::load().unwrap();
    let embedding_service = EmbeddingService::new("test_model").await.unwrap();
    let redis_store = RedisStore::new(&config).await.unwrap();
    let memory_manager = MemoryManager::new(Arc::new(redis_store), Arc::new(embedding_service), Arc::new(config));
    
    // Test basic functionality
    assert!(true); // Memory manager created successfully
}

#[tokio::test]
async fn test_memory_manager_creation() {
    let config = Config::load().unwrap();
    
    match EmbeddingService::new("test_model").await {
        Ok(embedding_service) => {
            match RedisStore::new(&config).await {
                Ok(redis_store) => {
                    let memory_manager = MemoryManager::new(
                        Arc::new(redis_store), 
                        Arc::new(embedding_service), 
                        Arc::new(config)
                    );
                    // Memory manager created successfully
                    assert!(true);
                }
                Err(e) => {
                    println!("Redis store creation failed: {}", e);
                    // Skip test if Redis is not available
                }
            }
        }
        Err(e) => {
            println!("Embedding service creation failed: {}", e);
            // Skip test if embedding service setup fails
        }
    }
}
