import { periodogram } from './periodogram';
import { windowApply } from '../data/windowApply';
import { nextpow2 } from './nextpow2';

/**
 * Welch's method
 * Computes overlapping modified periodograms and averages them together
 * @param {number[]} signal - The input signal
 * @param {number} sample_rate - The sample rate
 * @param {object} options 
 * @param {number} [options.segmentLength=256] - How long each segment should be in samples
 * @param {number} [options.overlapLength=null] - Amount of overlap between segments in samples. Defaults to floor(segmentLength / 2).
 * @param {string|number[]} [options.window='hann'] - Window function to apply, either 'hann', 'rectangular', or an array for a custom window. Default is 'hann'.
 * @param {number} [options.fftSize=Math.pow(2, bci.nextpow2(signal.length))] - Size of the fft to be used. Should be a power of 2.
 * @returns {object} PSD object with keys {estimates: PSD estimates in units of X^2/Hz, frequencies: corresponding frequencies in Hz}
 */
export function welch(signal, sample_rate, options) {
    let { segmentLength, overlapLength, fftSize, window } = Object.assign({
        segmentLength: 256,
        overlapLength: null,
        window: 'hann',
        fftSize: null
    }, options);

    if(overlapLength === null) overlapLength = Math.floor(segmentLength / 2);
    if(fftSize === null) fftSize = 2**nextpow2(segmentLength);
    
    let step = segmentLength - overlapLength;

    if(step <= 0) throw new Error('Invalid overlap, must be less than segmentLength');

    let PSDs = windowApply(signal, epoch => {
        return periodogram(epoch, sample_rate, {fftSize: fftSize, window: window});
    }, segmentLength, step, false);

    if(PSDs.length == 0) throw new Error('Unable to calculate any PSD estimates');
    if(PSDs.length == 1) {
        console.warn('Not enough data to compute more than one segment, returning single modified periodogram.');
        return PSDs[0];
    }

    // Compute average PSD
    let num_estimates = PSDs[0].estimates.length;
    let avg = new Array(num_estimates).fill(0);
    for(let p = 0; p < PSDs.length; p++) {
        for(let i = 0; i < num_estimates; i++) {
            avg[i] += PSDs[p].estimates[i];
        }
    }
    for(let i = 0; i < num_estimates; i++) {
        avg[i] = avg[i] / PSDs.length;
    }

    return {
        estimates: avg,
        frequencies: PSDs[0].frequencies
    };
}
