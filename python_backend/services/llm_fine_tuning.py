"""
Module for fine-tuning the local LLM on telecom-specific data.
"""
from typing import List, Dict, Any, Optional, Union
import os
import json
import logging
import datetime
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LLMFineTuningService:
    """Service for fine-tuning the local LLM on telecom-specific data"""
    
    def __init__(self):
        """Initialize the fine-tuning service"""
        # Create directory for storing fine-tuning datasets if it doesn't exist
        self.data_dir = Path("data/fine_tuning")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Directory to store fine-tuned models
        self.models_dir = Path("data/fine_tuned_models")
        self.models_dir.mkdir(parents=True, exist_ok=True)
        
        # Keep track of fine-tuning jobs
        self.jobs_file = self.data_dir / "fine_tuning_jobs.json"
        self.jobs = self._load_jobs()
        
        # Fine-tuning configuration
        self.default_config = {
            "learning_rate": 2e-5,
            "num_train_epochs": 3,
            "per_device_train_batch_size": 4,
            "gradient_accumulation_steps": 2,
            "warmup_steps": 50,
            "weight_decay": 0.01,
            "lora_r": 16,
            "lora_alpha": 32,
            "lora_dropout": 0.05,
        }
    
    def _load_jobs(self) -> List[Dict[str, Any]]:
        """Load fine-tuning jobs from the jobs file"""
        if self.jobs_file.exists():
            try:
                with open(self.jobs_file, 'r') as f:
                    return json.load(f)
            except json.JSONDecodeError:
                logger.error("Error decoding fine-tuning jobs file. Creating a new one.")
                return []
        return []
    
    def _save_jobs(self) -> None:
        """Save fine-tuning jobs to the jobs file"""
        with open(self.jobs_file, 'w') as f:
            json.dump(self.jobs, f, indent=2)
    
    def prepare_dataset_from_logs(self, log_contents: List[str], 
                                 analysis_results: List[Dict[str, Any]],
                                 dataset_name: str) -> Dict[str, Any]:
        """
        Prepare a fine-tuning dataset from parsed logs and their analysis results
        
        Args:
            log_contents: List of log contents
            analysis_results: List of analysis results corresponding to each log
            dataset_name: Name of the dataset
            
        Returns:
            Dictionary with dataset information
        """
        if len(log_contents) != len(analysis_results):
            raise ValueError("The number of logs and analysis results must match")
        
        # Create a unique dataset ID
        dataset_id = f"telecom_dataset_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Create a list of training examples in the format expected by the fine-tuning API
        training_examples = []
        
        for log, analysis in zip(log_contents, analysis_results):
            # Create system prompt
            system_prompt = "You are a telecom log analysis assistant. Analyze the provided log for issues and recommend solutions."
            
            # Create user message with the log content
            user_message = f"Please analyze this telecom log file and identify any issues:\n\n{log}"
            
            # Create assistant message with the analysis result
            # Format the analysis as a structured response
            issues = analysis.get("issues", [])
            recommendations = analysis.get("recommendations", [])
            
            assistant_message = "Based on the telecom log analysis:\n\n"
            
            # Add issues
            assistant_message += "Issues found:\n"
            for i, issue in enumerate(issues, 1):
                issue_text = issue.get("description", "Unknown issue")
                severity = issue.get("severity", "medium")
                assistant_message += f"{i}. {issue_text} (Severity: {severity})\n"
            
            # Add recommendations
            assistant_message += "\nRecommendations:\n"
            for i, recommendation in enumerate(recommendations, 1):
                rec_text = recommendation.get("description", "No recommendation available")
                assistant_message += f"{i}. {rec_text}\n"
            
            # Create the training example
            training_example = {
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                    {"role": "assistant", "content": assistant_message}
                ]
            }
            
            training_examples.append(training_example)
        
        # Save the dataset to a file
        dataset_file = self.data_dir / f"{dataset_id}.json"
        with open(dataset_file, 'w') as f:
            json.dump(training_examples, f, indent=2)
        
        # Record the dataset information
        dataset_info = {
            "id": dataset_id,
            "name": dataset_name,
            "file_path": str(dataset_file),
            "num_examples": len(training_examples),
            "created_at": datetime.datetime.now().isoformat(),
            "status": "created"
        }
        
        logger.info(f"Created fine-tuning dataset: {dataset_id} with {len(training_examples)} examples")
        
        return dataset_info
    
    def start_fine_tuning(self, dataset_id: str, 
                         model_name: str = "llama-3.1-8b-local", 
                         config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Start a fine-tuning job for the specified dataset
        
        Args:
            dataset_id: ID of the dataset to use for fine-tuning
            model_name: Name of the base model to fine-tune
            config: Fine-tuning configuration parameters (optional)
            
        Returns:
            Dictionary with job information
        """
        # Find the dataset
        dataset_file = self.data_dir / f"{dataset_id}.json"
        if not dataset_file.exists():
            raise FileNotFoundError(f"Dataset file not found: {dataset_file}")
        
        # Create a unique job ID
        job_id = f"fine_tuning_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Merge the provided config with the default config
        job_config = self.default_config.copy()
        if config:
            job_config.update(config)
        
        # Create the job information
        job_info = {
            "id": job_id,
            "dataset_id": dataset_id,
            "model_name": model_name,
            "config": job_config,
            "status": "pending",
            "created_at": datetime.datetime.now().isoformat(),
            "started_at": None,
            "completed_at": None,
            "output_model_name": f"{model_name}_ft_{job_id}",
            "metrics": {}
        }
        
        # Add the job to the list of jobs
        self.jobs.append(job_info)
        self._save_jobs()
        
        # In a real implementation, this would start the fine-tuning process
        # using the appropriate LLM API for fine-tuning
        # For now, we'll simulate the process
        logger.info(f"Started fine-tuning job: {job_id}")
        
        # Simulate starting the job
        job_info["status"] = "running"
        job_info["started_at"] = datetime.datetime.now().isoformat()
        self._save_jobs()
        
        return job_info
    
    def get_fine_tuning_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a fine-tuning job
        
        Args:
            job_id: ID of the fine-tuning job
            
        Returns:
            Dictionary with job information, or None if not found
        """
        for job in self.jobs:
            if job["id"] == job_id:
                return job
        return None
    
    def get_all_fine_tuning_jobs(self) -> List[Dict[str, Any]]:
        """
        Get information about all fine-tuning jobs
        
        Returns:
            List of dictionaries with job information
        """
        return self.jobs
    
    def simulate_job_completion(self, job_id: str, success: bool = True) -> Optional[Dict[str, Any]]:
        """
        Simulate the completion of a fine-tuning job (for development purposes)
        
        Args:
            job_id: ID of the fine-tuning job
            success: Whether the job succeeded or failed
            
        Returns:
            Updated job information, or None if not found
        """
        job = self.get_fine_tuning_job(job_id)
        if not job:
            return None
        
        if success:
            job["status"] = "completed"
            job["metrics"] = {
                "train_loss": 0.1234,
                "eval_loss": 0.2345,
                "train_runtime": 1200,
                "train_samples_per_second": 8.0,
                "epoch": 3.0
            }
        else:
            job["status"] = "failed"
            job["error"] = "Simulated failure"
        
        job["completed_at"] = datetime.datetime.now().isoformat()
        self._save_jobs()
        
        return job
    
    def get_available_fine_tuned_models(self) -> List[Dict[str, Any]]:
        """
        Get a list of available fine-tuned models
        
        Returns:
            List of dictionaries with model information
        """
        fine_tuned_models = []
        
        for job in self.jobs:
            if job["status"] == "completed":
                model_info = {
                    "id": job["output_model_name"],
                    "base_model": job["model_name"],
                    "fine_tuned_from_dataset": job["dataset_id"],
                    "created_at": job["completed_at"],
                    "job_id": job["id"]
                }
                fine_tuned_models.append(model_info)
        
        return fine_tuned_models

# Create an instance of the service
fine_tuning_service = LLMFineTuningService()