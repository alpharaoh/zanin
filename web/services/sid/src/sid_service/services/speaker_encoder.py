"""Speaker embedding extraction using SpeechBrain ECAPA-TDNN."""

import numpy as np
import torch
import torchaudio
from speechbrain.inference.speaker import SpeakerRecognition

from ..core.logging import get_logger

logger = get_logger(__name__)


class SpeakerEncoder:
    """
    Extracts speaker embeddings using the ECAPA-TDNN model from SpeechBrain.

    The model produces 192-dimensional embeddings that capture unique voice characteristics.
    These embeddings can be compared using cosine similarity for speaker verification.
    """

    def __init__(self, device: str | None = None) -> None:
        """
        Initialize the speaker encoder.

        Args:
            device: Device to run inference on ("cuda", "cpu", or None for auto-detect)
        """
        self._model: SpeakerRecognition | None = None
        self._device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self._initialized = False

    def initialize(self) -> None:
        """Load the ECAPA-TDNN model from HuggingFace."""
        if self._initialized:
            return

        logger.info("Loading ECAPA-TDNN model", device=self._device)

        self._model = SpeakerRecognition.from_hparams(
            source="speechbrain/spkrec-ecapa-voxceleb",
            savedir="/tmp/speechbrain_models/spkrec-ecapa-voxceleb",
            run_opts={"device": self._device},
        )

        self._initialized = True
        logger.info("ECAPA-TDNN model loaded successfully")

    @property
    def is_initialized(self) -> bool:
        """Check if the model is loaded."""
        return self._initialized

    def encode_file(self, audio_path: str) -> np.ndarray:
        """
        Extract speaker embedding from an audio file.

        Args:
            audio_path: Path to the audio file (WAV, MP3, FLAC, etc.)

        Returns:
            192-dimensional numpy array representing the speaker embedding
        """
        if not self._initialized:
            raise RuntimeError("SpeakerEncoder not initialized. Call initialize() first.")

        logger.debug("Extracting embedding from file", path=audio_path)

        # Load and resample audio to 16kHz if needed
        signal, sample_rate = torchaudio.load(audio_path)

        if sample_rate != 16000:
            resampler = torchaudio.transforms.Resample(
                orig_freq=sample_rate, new_freq=16000
            )
            signal = resampler(signal)

        # Convert to mono if stereo
        if signal.shape[0] > 1:
            signal = torch.mean(signal, dim=0, keepdim=True)

        # Extract embedding
        embedding = self._model.encode_batch(signal)

        # Convert to numpy and flatten
        embedding_np = embedding.squeeze().cpu().numpy()

        logger.debug(
            "Embedding extracted",
            shape=embedding_np.shape,
            norm=float(np.linalg.norm(embedding_np)),
        )

        return embedding_np

    def encode_waveform(
        self, waveform: np.ndarray, sample_rate: int = 16000
    ) -> np.ndarray:
        """
        Extract speaker embedding from a waveform array.

        Args:
            waveform: Audio waveform as numpy array (1D or 2D with shape [channels, samples])
            sample_rate: Sample rate of the audio

        Returns:
            192-dimensional numpy array representing the speaker embedding
        """
        if not self._initialized:
            raise RuntimeError("SpeakerEncoder not initialized. Call initialize() first.")

        # Convert to tensor
        if waveform.ndim == 1:
            signal = torch.from_numpy(waveform).unsqueeze(0).float()
        else:
            signal = torch.from_numpy(waveform).float()

        # Resample if needed
        if sample_rate != 16000:
            resampler = torchaudio.transforms.Resample(
                orig_freq=sample_rate, new_freq=16000
            )
            signal = resampler(signal)

        # Convert to mono if stereo
        if signal.shape[0] > 1:
            signal = torch.mean(signal, dim=0, keepdim=True)

        # Extract embedding
        embedding = self._model.encode_batch(signal)

        return embedding.squeeze().cpu().numpy()

    def compute_similarity(
        self, embedding1: np.ndarray, embedding2: np.ndarray
    ) -> float:
        """
        Compute cosine similarity between two speaker embeddings.

        Args:
            embedding1: First speaker embedding
            embedding2: Second speaker embedding

        Returns:
            Cosine similarity score between -1 and 1 (higher = more similar)
        """
        # Normalize embeddings
        norm1 = np.linalg.norm(embedding1)
        norm2 = np.linalg.norm(embedding2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        # Compute cosine similarity
        similarity = np.dot(embedding1, embedding2) / (norm1 * norm2)

        return float(similarity)

    def verify(
        self, embedding: np.ndarray, reference_embedding: np.ndarray, threshold: float
    ) -> tuple[bool, float]:
        """
        Verify if an embedding matches a reference embedding.

        Args:
            embedding: Embedding to verify
            reference_embedding: Reference embedding to compare against
            threshold: Similarity threshold for verification

        Returns:
            Tuple of (is_match, similarity_score)
        """
        similarity = self.compute_similarity(embedding, reference_embedding)
        is_match = similarity >= threshold

        return is_match, similarity
